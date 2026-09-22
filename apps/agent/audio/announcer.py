"""PrintBuddy soundbox: queued audio announcements for the local agent.

Architecture
------------
One background *worker thread* owns all audio output. Callers call the
module-level announce_*() functions from any thread and return immediately
— nothing audio-related ever blocks or raises into the print loop.

Phrase templates live in PHRASES_EN so they are easy to edit and translate.
To add Hindi (via Piper later), add PHRASES_HI and route via _phrases().

TTS uses native Windows speech on Windows and pyttsx3 on Linux.
Both run offline on the shop computer; the dashboard does not need to stay open.
"""
from __future__ import annotations

import base64
import logging
import json
import os
import queue
import subprocess
import sys
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

log = logging.getLogger("printbuddy-agent.audio")

ASSETS_DIR = Path(__file__).parent.parent / "assets"
CHIME_PATH = ASSETS_DIR / "ding.wav"

# ── Phrase templates ─────────────────────────────────────────────────────────
# Keep one dict per language; keys are stable identifiers used by the agent.

PHRASES_EN: dict[str, str] = {
    "payment_received_single": "Payment received. {amount} rupees.",
    "payment_received_copies": "Payment received. {amount} rupees. {copies} copies.",
    "print_complete": "Print complete.",
    "print_failed": "Print failed. Please check the printer.",
    "payment_failed": "Payment failed.",
}


def _phrases(language: str = "en") -> dict[str, str]:
    # Extend here when Hindi (Piper) templates are ready:
    # if language == "hi": return PHRASES_HI
    return PHRASES_EN


# ── TTS engine interface ─────────────────────────────────────────────────────


class TtsEngine:
    """Abstract TTS interface. Subclass and override speak()."""

    @property
    def available(self) -> bool:
        return True

    def speak(self, text: str) -> None:
        raise NotImplementedError

    def set_volume(self, volume: int) -> None:
        self._volume = max(0, min(100, volume)) / 100.0


class WindowsSpeechEngine(TtsEngine):
    """Run Windows speech in an isolated process, avoiding cross-thread COM loops."""

    def __init__(self, volume: int = 80) -> None:
        self.set_volume(volume)

    def speak(self, text: str) -> None:
        encoded = base64.b64encode(text.encode("utf-8")).decode("ascii")
        script = (
            "$ErrorActionPreference='Stop'; "
            "$s=New-Object -ComObject SAPI.SpVoice; "
            f"$s.Volume={round(self._volume * 100)}; "
            f"$text=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{encoded}')); "
            "$null=$s.Speak($text);"
        )
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script],
            input=json.dumps({"text": text, "volume": round(self._volume * 100)}),
            text=True, capture_output=True, timeout=30,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        if result.returncode:
            raise RuntimeError(f"Windows speech failed: {result.stderr.strip()}")


class Pyttsx3Engine(TtsEngine):
    """Offline TTS via pyttsx3.

    pyttsx3 is not thread-safe and hangs if its internal run-loop is reused.
    We create a *fresh* engine per utterance (init → say → runAndWait → stop)
    which avoids the known cross-call hang, at the cost of ~50ms init overhead.
    This runs only inside the single audio worker thread.
    """

    def __init__(self, rate: int = 150, volume: float = 1.0) -> None:
        self._rate = rate
        self._volume = volume
        self._available = self._probe()

    def _probe(self) -> bool:
        try:
            import pyttsx3  # type: ignore
            eng = pyttsx3.init()
            eng.stop()
            return True
        except Exception as exc:
            exc_str = str(exc).lower()
            if "espeak" in exc_str or "no module" in exc_str or "speech" in exc_str:
                log.warning(
                    "Audio: pyttsx3 unavailable — on Linux install espeak-ng: "
                    "sudo apt install espeak-ng"
                )
            else:
                log.warning("Audio: pyttsx3 probe failed: %s", exc)
            return False

    @property
    def available(self) -> bool:
        return self._available

    def speak(self, text: str) -> None:
        if not self._available:
            return
        try:
            import pyttsx3  # type: ignore
            eng = pyttsx3.init()
            eng.setProperty("rate", self._rate)
            eng.setProperty("volume", self._volume)
            eng.say(text)
            eng.runAndWait()
            eng.stop()
        except Exception as exc:
            raise RuntimeError(f"TTS speak failed: {exc}") from exc


# ── Chime playback ───────────────────────────────────────────────────────────


def _play_chime() -> None:
    """Play CHIME_PATH once. All errors are silently swallowed."""
    if not CHIME_PATH.exists():
        return
    try:
        if sys.platform == "win32":
            import winsound
            winsound.PlaySound(str(CHIME_PATH), winsound.SND_FILENAME)
        else:
            subprocess.run(
                ["aplay", "-q", str(CHIME_PATH)],
                timeout=5,
                capture_output=True,
            )
    except Exception as exc:
        log.debug("Audio: chime playback failed: %s", exc)


# ── Announcement dataclass ───────────────────────────────────────────────────


@dataclass
class Announcement:
    phrase: str
    play_chime: bool = True


_STOP = None  # sentinel to stop the worker


# ── Announcer: the core class ────────────────────────────────────────────────


class Announcer:
    """Thread-safe announcement queue backed by a single daemon worker thread.

    Instantiate once at agent startup. Call enqueue() from any thread.
    Playback errors are logged and the next announcement is retried.
    """

    def __init__(self, tts: Optional[TtsEngine] = None, volume: int = 80) -> None:
        self._q: "queue.Queue[Optional[Announcement]]" = queue.Queue()
        self._tts = tts
        self._volume = max(0, min(100, volume))
        self._warned = False
        self._thread = threading.Thread(
            target=self._worker, name="audio-worker", daemon=True
        )
        self._thread.start()

    def enqueue(self, phrase: str, play_chime: bool = True) -> None:
        """Non-blocking. Returns immediately."""
        self._q.put(Announcement(phrase=phrase, play_chime=play_chime))

    def shutdown(self) -> None:
        self._q.put(_STOP)
        self._thread.join(timeout=5)

    def set_volume(self, volume: int) -> None:
        self._volume = max(0, min(100, volume))

    def _worker(self) -> None:
        # Create and use the engine on the same thread (required by COM drivers).
        if self._tts is None:
            self._tts = (WindowsSpeechEngine(self._volume) if sys.platform == "win32"
                         else Pyttsx3Engine(volume=self._volume / 100.0))
        while True:
            item = self._q.get()
            if item is _STOP:
                break
            self._play(item)  # type: ignore[arg-type]

    def _play(self, ann: Announcement) -> None:
        if self._volume == 0:
            return
        try:
            if self._tts is None or not self._tts.available:
                raise RuntimeError("Speech engine unavailable; install an OS speech voice")
            self._tts.set_volume(self._volume)
            self._tts.speak(ann.phrase)
        except Exception as exc:
            if not self._warned:
                log.warning(
                    "Audio: speech failed (will retry next announcement): %s", exc
                )
                self._warned = True


# ── Audio device check ───────────────────────────────────────────────────────


def _audio_device_present() -> bool:
    """Best-effort probe for an audio output device. Defaults to True on error."""
    try:
        if sys.platform == "win32":
            import winsound
            # Attempt to play a null sound; raises RuntimeError if no device.
            winsound.PlaySound(None, winsound.SND_ASYNC | winsound.SND_NODEFAULT)
            return True
        else:
            # /proc/asound/cards is present on ALSA Linux systems (Raspberry Pi).
            cards_path = Path("/proc/asound/cards")
            if cards_path.exists():
                return "no soundcards" not in cards_path.read_text().lower()
            # Fallback: run aplay -l; if it lists at least one card, we're good.
            result = subprocess.run(
                ["aplay", "-l"], capture_output=True, text=True, timeout=3
            )
            return "card" in result.stdout.lower()
    except Exception:
        return True  # assume present if we cannot check


# ── Module-level singleton ───────────────────────────────────────────────────

_instance: Optional[Announcer] = None
_enabled: bool = False
_language: str = "en"


def _make_announcer(volume: int) -> Optional[Announcer]:
    if not _audio_device_present():
        log.warning(
            "Audio: no output device detected — voice announcements disabled. "
            "Attach a speaker and restart the agent to enable them."
        )
        return None
    try:
        ann = Announcer(volume=volume)
        log.info("Audio: announcer initialised (volume=%d%%)", volume)
        return ann
    except Exception as exc:
        log.warning("Audio: failed to start announcer: %s", exc)
        return None


def init(*, enabled: bool, volume: int = 80, language: str = "en") -> None:
    """Initialise the announcer once at agent startup."""
    global _instance, _enabled, _language
    _enabled = enabled
    _language = language
    log.info(
        "Audio: init — enabled=%s volume=%d language=%s",
        enabled, volume, language,
    )
    if _instance is None and enabled:
        _instance = _make_announcer(volume)
    elif not enabled:
        log.info(
            "Audio: announcements disabled. Enable via the dashboard 'Voice announcements' "
            "toggle, or set AGENT_SOUND_ENABLED=true in .env to override locally."
        )


def configure(*, enabled: bool, volume: int = 80, language: str = "en") -> None:
    """Update settings mid-run (called each heartbeat cycle)."""
    global _instance, _enabled, _language
    changed = (enabled != _enabled)
    _enabled = enabled
    _language = language
    if enabled and _instance is None:
        log.info("Audio: enabling announcements (volume=%d, language=%s)", volume, language)
        _instance = _make_announcer(volume)
    elif changed and not enabled:
        log.info("Audio: announcements disabled by operator toggle.")
    if _instance is not None:
        _instance.set_volume(volume if enabled else 0)


def _announce(key: str, **kwargs: object) -> None:
    if not _enabled or _instance is None:
        return
    phrase = _phrases(_language).get(key, "")
    if not phrase:
        return
    try:
        text = phrase.format(**kwargs)
    except KeyError:
        text = phrase
    _instance.enqueue(text)


# ── Public event functions ───────────────────────────────────────────────────


def announce_payment_received(amount_paise: int, copies: int) -> None:
    amount_rupees = f"{amount_paise / 100:.2f}".rstrip("0").rstrip(".")
    if copies > 1:
        _announce("payment_received_copies", amount=amount_rupees, copies=copies)
    else:
        _announce("payment_received_single", amount=amount_rupees)


def announce_print_complete() -> None:
    _announce("print_complete")


def announce_print_failed() -> None:
    _announce("print_failed")


def announce_payment_failed() -> None:
    _announce("payment_failed")
