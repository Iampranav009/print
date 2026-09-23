"""PrintBuddy Print Agent — polls the API for jobs and prints them.

Supports three print modes (PRINTBUDDY_PRINT_MODE):
  simulate — log the command that would run, sleep, report printed
  virtual  — send to a cups-pdf virtual printer (exercises real CUPS path)
  real     — send to a physical printer via CUPS (Linux) or SumatraPDF (Windows)
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
import tempfile
import time
import threading
from logging.handlers import RotatingFileHandler
import requests

from config import (
    API_BASE,
    SHOP_ID,
    AGENT_TOKEN,
    PRINTER_NAME,
    POLL_INTERVAL,
    PRINT_MODE,
    SIMULATE_PRINT_SECONDS,
    SIMULATE_FAIL,
    CAPABILITY_REFRESH_MINUTES,
    AGENT_SOUND_ENABLED,
    CONFIG_DIR,
)
from printing.capabilities import discover_capabilities, FULL_DEFAULT
from printing.cups_printer import build_cups_options, format_cups_command, print_cups
from printing.windows_printer import print_windows
from audio import announcer as audio

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("printbuddy-agent")

HEADERS = {"Authorization": f"Bearer {AGENT_TOKEN}"}
PENDING_STATUS_FILE = CONFIG_DIR / "pending-print-status.json"

_last_known_caps: dict | None = None


# ── Discovered printers ──────────────────────────────────


from printing.discovery import get_discovered_printers


# ── API helpers ──────────────────────────────────────────


def heartbeat(printer_status: str = "online") -> dict:
    global PRINTER_NAME, _last_known_caps
    try:
        payload: dict = {"printerStatus": printer_status}
        discovered = get_discovered_printers()
        payload["discoveredPrinters"] = discovered
        payload["printerName"] = PRINTER_NAME
        payload["printerStatus"] = ("online" if any(p["name"] == PRINTER_NAME for p in discovered) else "offline")

        resp = requests.post(
            f"{API_BASE}/api/agent/heartbeat",
            json=payload,
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        config = data.get("printerConfig")
        if config is not None:
            selected = config.get("os_printer_name") or ""
            if selected != PRINTER_NAME:
                PRINTER_NAME = selected
                _last_known_caps = None
                log.info("Printer selection updated from dashboard: %s", selected or "not configured")
        log.info("Heartbeat sent to server (printer_status=%s)", printer_status)
        return data
    except Exception as e:
        log.warning("Heartbeat failed: %s", e)
        return {}


def update_status(job_id: str, status: str, reason: str | None = None) -> bool:
    terminal = status in ("printed", "print_failed")
    if terminal:
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        staged = PENDING_STATUS_FILE.with_suffix(".tmp")
        staged.write_text(json.dumps({"job_id": job_id, "status": status, "reason": reason}), encoding="utf-8")
        os.replace(staged, PENDING_STATUS_FILE)
    payload: dict = {"status": status}
    if reason:
        payload["reason"] = reason
    try:
        resp = requests.post(
            f"{API_BASE}/api/agent/jobs/{job_id}/status",
            json=payload,
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        if terminal:
            PENDING_STATUS_FILE.unlink(missing_ok=True)
        log.info("[%s] → %s%s", job_id[:8], status, f" ({reason})" if reason else "")
        return True
    except Exception as e:
        log.error("[%s] Failed to update status to %s: %s", job_id[:8], status, e)
        return False


def flush_pending_status() -> bool:
    """Report a completed local print before accepting another paid job."""
    if not PENDING_STATUS_FILE.exists():
        return True
    try:
        pending = json.loads(PENDING_STATUS_FILE.read_text(encoding="utf-8"))
        return update_status(pending["job_id"], pending["status"], pending.get("reason"))
    except Exception as e:
        log.error("Could not restore pending print status: %s", e)
        return False


def post_capabilities(capabilities: dict, make_and_model: str | None = None) -> None:
    try:
        resp = requests.post(
            f"{API_BASE}/api/agent/printers/capabilities",
            json={"capabilities": capabilities, "make_and_model": make_and_model},
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("applied") is False:
            log.info("Capabilities not applied: %s", data.get("reason"))
        else:
            log.info("Capabilities posted to server (make_and_model=%s)", make_and_model)
    except Exception as e:
        log.warning("Failed to post capabilities: %s", e)


def download_file(url: str) -> str | None:
    try:
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        fd, path = tempfile.mkstemp(suffix=".pdf")
        with os.fdopen(fd, "wb") as f:
            f.write(resp.content)
        log.info("Downloaded %d bytes to %s", len(resp.content), path)
        return path
    except Exception as e:
        log.error("Download failed: %s", e)
        return None


def ack_announcements(ids: list[str]) -> None:
    if not ids:
        return
    try:
        resp = requests.post(
            f"{API_BASE}/api/agent/announcements/ack",
            json={"ids": ids},
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        log.debug("Acked %d announcement(s)", len(ids))
    except Exception as e:
        log.warning("Failed to ack announcements: %s", e)


# ── Forced failure logic ─────────────────────────────────


def check_forced_failure(job: dict) -> str | None:
    """Return a failure reason string, or None if the job should succeed."""
    per_job = job.get("simulateFail")
    if per_job and per_job != "none":
        return per_job

    if SIMULATE_FAIL and SIMULATE_FAIL != "none":
        return SIMULATE_FAIL

    return None


# ── Print mode: simulate ─────────────────────────────────


def print_simulate(file_path: str, job: dict) -> tuple[bool, str | None]:
    options = build_cups_options(job, _last_known_caps)
    cmd = format_cups_command(PRINTER_NAME, file_path, options)
    log.info("[%s] SIMULATE would run: %s", job["id"][:8], cmd)

    failure = check_forced_failure(job)
    if failure:
        log.info("[%s] SIMULATE forced failure: %s", job["id"][:8], failure)
        return False, failure

    log.info("[%s] SIMULATE sleeping %ds...", job["id"][:8], SIMULATE_PRINT_SECONDS)
    time.sleep(SIMULATE_PRINT_SECONDS)
    return True, None


# ── Print mode: virtual (cups-pdf) ──────────────────────


def print_virtual(file_path: str, job: dict) -> tuple[bool, str | None]:
    failure = check_forced_failure(job)
    if failure:
        log.info("[%s] VIRTUAL forced failure: %s", job["id"][:8], failure)
        return False, failure

    return print_cups(PRINTER_NAME, file_path, job, _last_known_caps)


# ── Print mode: real ─────────────────────────────────────


def print_real(file_path: str, job: dict) -> tuple[bool, str | None]:
    printer_name = job.get("osPrinterName", PRINTER_NAME)
    if not printer_name:
        return False, "Select and save a printer in the shop dashboard first"
    failure = check_forced_failure(job)
    if failure:
        log.info("[%s] REAL forced failure: %s", job["id"][:8], failure)
        return False, failure

    if sys.platform == "linux":
        return print_cups(printer_name, file_path, job, _last_known_caps if printer_name == PRINTER_NAME else None)
    elif sys.platform == "win32":
        return print_windows(printer_name, file_path, job, _last_known_caps if printer_name == PRINTER_NAME else None)
    else:
        return False, f"Unsupported platform: {sys.platform}"


# ── Dispatch by mode ─────────────────────────────────────


PRINT_HANDLERS = {
    "simulate": print_simulate,
    "virtual": print_virtual,
    "real": print_real,
}


def print_file(file_path: str, job: dict) -> tuple[bool, str | None]:
    handler = PRINT_HANDLERS.get(PRINT_MODE)
    if not handler:
        return False, f"Unknown PRINTBUDDY_PRINT_MODE: {PRINT_MODE}"
    return handler(file_path, job)


# ── Capability detection ─────────────────────────────────


def detect_capabilities() -> tuple[dict, str | None]:
    """Discover capabilities for the configured printer.

    In simulate mode, returns the full default set with make_and_model=None.
    In virtual/real modes, delegates to printing.capabilities.discover_capabilities.
    On any failure, returns the full default set — never None.
    """
    if PRINT_MODE == "simulate":
        log.info("Simulate mode — using default capabilities")
        return dict(FULL_DEFAULT), None

    try:
        caps, make_and_model = discover_capabilities(PRINTER_NAME, sys.platform)
        return caps, make_and_model
    except Exception as e:
        log.warning("Capability detection raised unexpectedly: %s — using defaults", e)
        return dict(FULL_DEFAULT), None


# ── Sound settings helpers ───────────────────────────────


def _apply_sound_settings(hb_data: dict) -> None:
    """Update audio module from heartbeat response. Local env override wins."""
    if "soundSettings" not in hb_data:
        return  # A network failure must not turn off saved sound settings.
    remote = hb_data["soundSettings"]
    remote_enabled = bool(remote.get("enabled", False))
    effective_enabled = (
        AGENT_SOUND_ENABLED if AGENT_SOUND_ENABLED is not None else remote_enabled
    )
    audio.configure(
        enabled=effective_enabled,
        volume=int(remote.get("volume", 80)),
        language=str(remote.get("language", "en")),
    )


# ── Main loop ────────────────────────────────────────────


def poll_and_print() -> None:
    if not flush_pending_status():
        return
    try:
        resp = requests.get(
            f"{API_BASE}/api/agent/jobs/next",
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.RequestException as e:
        log.warning("Poll failed (server/network): %s", e)
        return
    except Exception as e:
        log.warning("Poll failed: %s", e)
        return

    # Process server-pushed announcements (e.g. payment_failed events).
    pending_announcements = data.get("announcements", [])
    if pending_announcements:
        ids_to_ack = []
        for ann in pending_announcements:
            ann_id = ann.get("id")
            kind = ann.get("kind")
            if kind == "payment_failed":
                audio.announce_payment_failed()
            if ann_id:
                ids_to_ack.append(ann_id)
        ack_announcements(ids_to_ack)

    job = data.get("job")
    if not job:
        return
    if PRINT_MODE == "real" and not job.get("osPrinterName", PRINTER_NAME):
        log.warning("Waiting for an installed printer to be selected in the dashboard.")
        return

    job_id = job["id"]
    status = job["status"]

    if status in ("dispatched", "released", "awaiting_release"):
        log.info("[%s] Job ready (%s) — auto-printing now...", job_id[:8], status)

        # Announce payment received immediately when a paid job arrives.
        audio.announce_payment_received(
            amount_paise=job.get("pricePaise", 0),
            copies=job.get("copies", 1),
        )

        download_url = job.get("downloadUrl")
        if not download_url:
            update_status(job_id, "print_failed", "No download URL")
            audio.announce_print_failed()
            return

        file_path = download_file(download_url)
        if not file_path:
            update_status(job_id, "print_failed", "File download failed")
            audio.announce_print_failed()
            return

        # Never send paper for a job the server did not accept as ours.
        # The ready job remains queued and can be retried on the next poll.
        if not update_status(job_id, "printing"):
            try:
                os.unlink(file_path)
            except OSError:
                pass
            return

        try:
            success, reason = print_file(file_path, job)
            if success:
                update_status(job_id, "printed")
                log.info("[%s] Successfully printed!", job_id[:8])
                audio.announce_print_complete()
            else:
                update_status(job_id, "print_failed", reason or "Printer error")
                log.error("[%s] Print failed: %s", job_id[:8], reason)
                audio.announce_print_failed()
        except Exception as e:
            log.exception("[%s] Unexpected print error", job_id[:8])
            update_status(job_id, "print_failed", str(e))
            audio.announce_print_failed()
        finally:
            try:
                os.unlink(file_path)
                log.info("[%s] Cleaned up temp file %s", job_id[:8], file_path)
            except OSError:
                pass
        return


def main(stop_event: threading.Event | None = None) -> None:
    global _last_known_caps
    stop_event = stop_event or threading.Event()

    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    # Hold an OS lock for the lifetime of this process, including manual launches.
    lock = open(CONFIG_DIR / "agent.lock", "a+b")
    lock.seek(0)
    if not lock.read(1):
        lock.write(b"0")
        lock.flush()
    lock.seek(0)
    try:
        if sys.platform == "win32":
            import msvcrt
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        log.error("PrintBuddy Agent is already running for this user.")
        lock.close()
        return
    handler = RotatingFileHandler(CONFIG_DIR / "agent.log", maxBytes=1_000_000, backupCount=2, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    logging.getLogger().addHandler(handler)

    log.info(
        "PrintBuddy Agent starting — mode=%s printer=%s shop_id=%s poll=%ds",
        PRINT_MODE,
        PRINTER_NAME,
        SHOP_ID[:8] + "...",
        POLL_INTERVAL,
    )

    try:
        # Fetch the saved printer before discovering its capabilities or polling jobs.
        hb_data = heartbeat()
        caps, make_and_model = detect_capabilities()
        _last_known_caps = caps
        post_capabilities(caps, make_and_model)

        hb_data = heartbeat()

        # Initialise audio using the first heartbeat's settings.
        remote = hb_data.get("soundSettings", {})
        remote_enabled = bool(remote.get("enabled", False))
        effective_enabled = (
            AGENT_SOUND_ENABLED if AGENT_SOUND_ENABLED is not None else remote_enabled
        )
        audio.init(
            enabled=effective_enabled,
            volume=int(remote.get("volume", 80)),
            language=str(remote.get("language", "en")),
        )

        # Discovery/heartbeat continues even while the print spooler is busy.
        def report_loop():
            while not stop_event.wait(10):
                _apply_sound_settings(heartbeat())
        reporter = threading.Thread(target=report_loop, name="heartbeat-worker", daemon=True)
        reporter.start()
        last_cap_time = time.monotonic()
        cap_refresh_secs = CAPABILITY_REFRESH_MINUTES * 60

        while not stop_event.is_set():
            poll_and_print()

            now = time.monotonic()
            if now - last_cap_time >= cap_refresh_secs:
                caps, make_and_model = detect_capabilities()
                _last_known_caps = caps
                post_capabilities(caps, make_and_model)
                last_cap_time = now

            stop_event.wait(POLL_INTERVAL)
    except KeyboardInterrupt:
        log.info("PrintBuddy Agent stopped cleanly by user.")
    finally:
        stop_event.set()
        if audio._instance is not None:
            audio._instance.shutdown()
        lock.close()


if __name__ == "__main__":
    main()
