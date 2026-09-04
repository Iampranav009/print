import logging
import os
import shutil
import subprocess

log = logging.getLogger("printbuddy-agent")


def get_sumatra_executable() -> str:
    """Resolve path to SumatraPDF executable."""
    env_path = os.environ.get("SUMATRAPDF_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    which_path = shutil.which("SumatraPDF.exe") or shutil.which("SumatraPDF")
    if which_path:
        return which_path

    local_app_data = os.environ.get("LOCALAPPDATA", "")
    prog_files = os.environ.get("ProgramFiles", "C:\\Program Files")
    prog_files_x86 = os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)")

    candidates = [
        os.path.join(local_app_data, "SumatraPDF", "SumatraPDF.exe"),
        os.path.join(prog_files, "SumatraPDF", "SumatraPDF.exe"),
        os.path.join(prog_files_x86, "SumatraPDF", "SumatraPDF.exe"),
    ]
    for candidate in candidates:
        if os.path.isfile(candidate):
            return candidate

    return "SumatraPDF.exe"


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
        sumatra_exe = get_sumatra_executable()
        cmd = [sumatra_exe, "-print-to", printer_name]
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
