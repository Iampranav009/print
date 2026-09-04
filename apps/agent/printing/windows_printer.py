"""SumatraPDF-based Windows printing for PrintBuddy."""

import logging
import subprocess

log = logging.getLogger("printbuddy-agent")


def print_windows(
    printer_name: str,
    file_path: str,
    job: dict,
    caps: dict | None = None,
) -> tuple[bool, str | None]:
    try:
        settings_parts: list[str] = []
        dropped: list[str] = []

        copies = job.get("copies", 1)
        if copies > 1:
            settings_parts.append(f"x{copies}")

        if not job.get("color", False):
            settings_parts.append("monochrome")

        if job.get("duplex", False):
            duplex_edge = job.get("duplexEdge") or job.get("duplex_edge") or "long"
            settings_parts.append("duplexshort" if duplex_edge == "short" else "duplexlong")

        if job.get("orientation") == "landscape":
            settings_parts.append("landscape")

        if job.get("pageRange") or job.get("page_range"):
            settings_parts.append(job.get("pageRange") or job.get("page_range"))

        paper = job.get("paper", "A4")
        settings_parts.append(f"paper={paper}")

        number_up = job.get("numberUp") or job.get("number_up") or 1
        if number_up > 1:
            settings_parts.append(f"nup={number_up}")

        if not job.get("collate", True):
            dropped.append("collate=false (SumatraPDF always collates)")

        quality = job.get("quality", "normal")
        if quality != "normal":
            dropped.append(f"quality={quality} (not supported by SumatraPDF)")

        media_type = job.get("mediaType") or job.get("media_type") or "plain"
        if media_type and media_type != "plain":
            dropped.append(f"media_type={media_type} (not supported by SumatraPDF)")

        if job.get("reverse", False):
            dropped.append("reverse (not supported by SumatraPDF)")

        scaling = job.get("scaling", "none")
        if scaling == "fit-to-page":
            settings_parts.append("fit")
        elif scaling == "shrink-to-fit":
            settings_parts.append("shrink")

        for f in job.get("finishings", []):
            dropped.append(f"finishing={f} (not supported by SumatraPDF)")

        if dropped:
            log.warning("[%s] Dropped options: %s", str(job.get("id", "?"))[:8], "; ".join(dropped))

        settings = ",".join(settings_parts) if settings_parts else ""
        cmd = ["SumatraPDF.exe", "-print-to", printer_name]
        if settings:
            cmd.extend(["-print-settings", settings])
        cmd.append(file_path)

        log.info("[%s] Windows command: %s", str(job.get("id", "?"))[:8], " ".join(cmd))
        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0:
            return False, f"SumatraPDF exit code {result.returncode}"
        return True, None
    except Exception as e:
        log.error("[%s] Windows print failed: %s", str(job.get("id", "?"))[:8], e)
        return False, str(e)
