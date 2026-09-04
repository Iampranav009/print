"""PrintBuddy Print Agent — polls the API for jobs and prints them.

Supports three print modes (PRINTBUDDY_PRINT_MODE):
  simulate — log the command that would run, sleep, report printed
  virtual  — send to a cups-pdf virtual printer (exercises real CUPS path)
  real     — send to a physical printer via CUPS (Linux) or SumatraPDF (Windows)
"""

import os
import sys
import time
import tempfile
import logging
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
)
from printing.capabilities import discover_capabilities, FULL_DEFAULT
from printing.cups_printer import build_cups_options, format_cups_command, print_cups
from printing.windows_printer import print_windows

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("printbuddy-agent")

HEADERS = {"Authorization": f"Bearer {AGENT_TOKEN}"}

_last_known_caps: dict | None = None

# ── API helpers ──────────────────────────────────────────


def heartbeat(printer_status: str = "online") -> None:
    try:
        resp = requests.post(
            f"{API_BASE}/api/agent/heartbeat",
            json={"printerStatus": printer_status},
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        log.info("Heartbeat sent to server (printer_status=%s)", printer_status)
    except Exception as e:
        log.warning("Heartbeat failed: %s", e)


def update_status(job_id: str, status: str, reason: str | None = None) -> None:
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
        log.info("[%s] → %s%s", job_id[:8], status, f" ({reason})" if reason else "")
    except Exception as e:
        log.error("[%s] Failed to update status to %s: %s", job_id[:8], status, e)


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
    failure = check_forced_failure(job)
    if failure:
        log.info("[%s] REAL forced failure: %s", job["id"][:8], failure)
        return False, failure

    if sys.platform == "linux":
        return print_cups(PRINTER_NAME, file_path, job, _last_known_caps)
    elif sys.platform == "win32":
        return print_windows(PRINTER_NAME, file_path, job, _last_known_caps)
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


# ── Main loop ────────────────────────────────────────────


def poll_and_print() -> None:
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

    job = data.get("job")
    if not job:
        return

    job_id = job["id"]
    status = job["status"]

    if status == "dispatched":
        log.info("[%s] Job dispatched — setting to awaiting_release", job_id[:8])
        update_status(job_id, "awaiting_release")
        return

    if status == "awaiting_release":
        # Waiting for customer tap or counter release; avoid spamming logs
        return

    if status == "released":
        log.info("[%s] Job released! Starting print process...", job_id[:8])
        download_url = job.get("downloadUrl")
        if not download_url:
            update_status(job_id, "print_failed", "No download URL")
            return

        file_path = download_file(download_url)
        if not file_path:
            update_status(job_id, "print_failed", "File download failed")
            return

        update_status(job_id, "printing")

        try:
            success, reason = print_file(file_path, job)
            if success:
                update_status(job_id, "printed")
            else:
                update_status(job_id, "print_failed", reason or "Printer error")
        finally:
            try:
                os.unlink(file_path)
                log.info("[%s] Cleaned up temp file %s", job_id[:8], file_path)
            except OSError:
                pass


def main() -> None:
    global _last_known_caps

    log.info(
        "PrintBuddy Agent starting — mode=%s printer=%s shop_id=%s poll=%ds",
        PRINT_MODE,
        PRINTER_NAME,
        SHOP_ID[:8] + "...",
        POLL_INTERVAL,
    )

    try:
        caps, make_and_model = detect_capabilities()
        _last_known_caps = caps
        post_capabilities(caps, make_and_model)
        heartbeat()

        heartbeat_counter = 0
        last_cap_time = time.monotonic()
        cap_refresh_secs = CAPABILITY_REFRESH_MINUTES * 60

        while True:
            poll_and_print()

            heartbeat_counter += 1
            if heartbeat_counter >= 10:
                heartbeat()
                heartbeat_counter = 0

            now = time.monotonic()
            if now - last_cap_time >= cap_refresh_secs:
                caps, make_and_model = detect_capabilities()
                _last_known_caps = caps
                post_capabilities(caps, make_and_model)
                last_cap_time = now

            time.sleep(POLL_INTERVAL)
    except KeyboardInterrupt:
        log.info("PrintBuddy Agent stopped cleanly by user.")


if __name__ == "__main__":
    main()
