"""CUPS option builder and print function for PrintBuddy."""

import logging
import time

log = logging.getLogger("printbuddy-agent")

QUALITY_TO_IPP = {"draft": "3", "normal": "4", "high": "5"}

FINISHINGS_MAP = {
    "staple": "4",
    "punch": "5",
    "bind": "7",
    "saddle-stitch": "8",
}


def build_cups_options(job: dict, caps: dict | None = None) -> dict[str, str]:
    """Build CUPS option dict from a job, applying capability-drop rules when caps provided."""
    options: dict[str, str] = {}
    dropped: list[str] = []

    options["copies"] = str(job.get("copies", 1))

    if job.get("pageRange") or job.get("page_range"):
        options["page-ranges"] = job.get("pageRange") or job.get("page_range")

    # Color: dual flags — ColorModel for driver-based, print-color-mode for IPP-everywhere
    if job.get("color", False):
        options["print-color-mode"] = "color"
    else:
        options["ColorModel"] = "Gray"
        options["print-color-mode"] = "monochrome"

    # Sides / duplex
    duplex = job.get("duplex", False)
    duplex_edge = job.get("duplexEdge") or job.get("duplex_edge") or "long"
    sides_value = (
        ("two-sided-short-edge" if duplex_edge == "short" else "two-sided-long-edge")
        if duplex
        else "one-sided"
    )
    if caps and sides_value not in caps.get("sides", [sides_value]):
        dropped.append(f"sides={sides_value} → falling back to one-sided")
        sides_value = "one-sided"
    if sides_value != "one-sided":
        options["sides"] = sides_value

    # Paper
    paper = job.get("paper", "A4")
    if caps and paper not in caps.get("media", [paper]):
        dropped.append(f"paper={paper} (not supported)")
    else:
        options["media"] = paper

    if job.get("orientation") == "landscape":
        options["orientation-requested"] = "4"

    # Number-up
    number_up = job.get("numberUp") or job.get("number_up") or 1
    if number_up > 1:
        if caps and number_up not in caps.get("number_up", [number_up]):
            dropped.append(f"number-up={number_up} (not supported)")
        else:
            options["number-up"] = str(number_up)
            options["number-up-layout"] = "lrtb"

    if not job.get("collate", True):
        options["Collate"] = "False"

    # Quality
    quality = job.get("quality", "normal")
    if caps and quality not in caps.get("quality", [quality]):
        dropped.append(f"quality={quality} (not supported)")
    elif quality in QUALITY_TO_IPP:
        options["print-quality"] = QUALITY_TO_IPP[quality]

    # Media type
    media_type = job.get("mediaType") or job.get("media_type") or "plain"
    if media_type and media_type != "plain":
        if caps and media_type not in caps.get("media_types", [media_type]):
            dropped.append(f"media-type={media_type} (not supported)")
        else:
            options["media-type"] = media_type

    if job.get("reverse", False):
        if caps and not caps.get("reverse", True):
            dropped.append("reverse (not supported)")
        else:
            options["outputorder"] = "reverse"

    # Scaling
    scaling = job.get("scaling", "none")
    if scaling in ("fit-to-page", "shrink-to-fit"):
        options["fit-to-page"] = "true"

    # Finishings — map to IPP finishing codes
    supported = caps.get("finishings", []) if caps else None
    ipp_codes: list[str] = []
    for f in job.get("finishings", []):
        if supported is not None and f not in supported:
            dropped.append(f"finishing={f} (not supported)")
            continue
        if f in FINISHINGS_MAP:
            ipp_codes.append(FINISHINGS_MAP[f])
    if ipp_codes:
        options["finishings"] = ",".join(ipp_codes)

    if dropped:
        job_id = str(job.get("id", "?"))[:8]
        log.warning("[%s] Dropped options: %s", job_id, "; ".join(dropped))

    return options


def format_cups_command(printer_name: str, file_path: str, options: dict[str, str]) -> str:
    copies = options.get("copies", "1")
    parts = ["lp", f"-d {printer_name}", f"-n {copies}"]
    for k, v in options.items():
        if k == "copies":
            continue
        parts.append(f"-o {k}={v}")
    parts.append(file_path)
    return " ".join(parts)


def print_cups(
    printer_name: str,
    file_path: str,
    job: dict,
    caps: dict | None = None,
) -> tuple[bool, str | None]:
    try:
        import cups  # type: ignore

        conn = cups.Connection()
        options = build_cups_options(job, caps)
        cmd = format_cups_command(printer_name, file_path, options)
        log.info("[%s] CUPS command: %s", str(job.get("id", "?"))[:8], cmd)

        cups_job_id = conn.printFile(printer_name, file_path, "PrintBuddy Job", options)
        log.info("[%s] CUPS job submitted: %d", str(job.get("id", "?"))[:8], cups_job_id)

        for _ in range(120):
            attrs = conn.getJobAttributes(cups_job_id)
            state = attrs.get("job-state", 0)
            if state >= 9:
                return True, None
            if state in (7, 8):
                return False, "CUPS job canceled or aborted"
            time.sleep(1)

        return True, None
    except Exception as e:
        log.error("[%s] CUPS print failed: %s", str(job.get("id", "?"))[:8], e)
        return False, str(e)
