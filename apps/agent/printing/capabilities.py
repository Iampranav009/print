"""Printer capability discovery via CUPS/IPP with lpoptions fallback.

Returns a dict matching the PrinterCapabilities shape:
  color, sides, media, media_types, number_up, quality,
  finishings, collate, reverse, scaling, max_copies
"""

import logging
import subprocess

log = logging.getLogger("printbuddy-agent")

# ── Canonical maps ───────────────────────────────────────────

PWG_MEDIA_MAP: dict[str, str] = {
    "iso_a4_210x297mm": "A4",
    "iso_a3_297x420mm": "A3",
    "iso_a5_148x210mm": "A5",
    "iso_a6_105x148mm": "A6",
    "na_letter_8.5x11in": "Letter",
    "na_legal_8.5x14in": "Legal",
    "na_ledger_11x17in": "Tabloid",
}

FINISHINGS_MAP: dict[int, str] = {
    4: "staple",
    5: "punch",
    7: "bind",
    8: "saddle-stitch",
}

QUALITY_MAP: dict[int, str] = {
    3: "draft",
    4: "normal",
    5: "high",
}

FULL_DEFAULT: dict = {
    "color": True,
    "sides": ["one-sided", "two-sided-long-edge", "two-sided-short-edge"],
    "media": ["A4", "A3", "A5", "Legal", "Letter"],
    "media_types": ["plain", "glossy", "cardstock"],
    "number_up": [1, 2, 4, 6, 9],
    "quality": ["draft", "normal", "high"],
    "finishings": ["staple", "punch"],
    "collate": True,
    "reverse": True,
    "scaling": ["none", "fit-to-page", "shrink-to-fit"],
    "max_copies": 99,
}


# ── Validation ───────────────────────────────────────────────

def is_well_formed(caps: dict) -> bool:
    return (
        isinstance(caps.get("media"), list) and len(caps["media"]) > 0
        and isinstance(caps.get("sides"), list) and len(caps["sides"]) > 0
        and isinstance(caps.get("number_up"), list) and len(caps["number_up"]) > 0
    )


def _coerce_list(val) -> list:
    if val is None:
        return []
    if isinstance(val, (list, tuple)):
        return list(val)
    return [val]


def _map_media(raw: list) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for m in raw:
        s = str(m).lower()
        canonical = PWG_MEDIA_MAP.get(s) or PWG_MEDIA_MAP.get(str(m))
        if not canonical:
            # Try simple matching for common short names
            if s in ("a4",): canonical = "A4"
            elif s in ("a3",): canonical = "A3"
            elif s in ("a5",): canonical = "A5"
            elif s in ("letter",): canonical = "Letter"
            elif s in ("legal",): canonical = "Legal"
        if canonical and canonical not in seen:
            seen.add(canonical)
            result.append(canonical)
    return result


def _map_quality(raw: list) -> list[str]:
    result: list[str] = []
    for q in raw:
        mapped = QUALITY_MAP.get(int(q)) if str(q).isdigit() else str(q)
        if mapped and mapped not in result:
            result.append(mapped)
    return result or ["normal"]


def _map_finishings(raw: list) -> list[str]:
    result: list[str] = []
    for f in raw:
        try:
            key = int(f)
        except (TypeError, ValueError):
            continue
        if key == 3:  # "none" finishing — skip
            continue
        mapped = FINISHINGS_MAP.get(key)
        if mapped and mapped not in result:
            result.append(mapped)
    return result


def _map_scaling(raw: list) -> list[str]:
    result: list[str] = ["none"]
    for s in raw:
        s = str(s).lower()
        if s in ("fit", "auto-fit", "fit-to-page") and "fit-to-page" not in result:
            result.append("fit-to-page")
        elif s in ("auto", "shrink", "shrink-to-fit") and "shrink-to-fit" not in result:
            result.append("shrink-to-fit")
    return result


# ── Primary path: pycups IPP ─────────────────────────────────

def _discover_via_cups(printer_name: str) -> tuple[dict | None, str | None]:
    """Returns (caps_dict, make_and_model) or (None, None) on failure."""
    try:
        import cups  # type: ignore
    except ImportError:
        return None, None

    try:
        conn = cups.Connection()
        attrs = conn.getPrinterAttributes(printer_name)
    except Exception as e:
        log.warning("getPrinterAttributes failed: %s", e)
        return None, None

    make_and_model: str | None = attrs.get("printer-make-and-model")

    # Color
    color_modes = _coerce_list(attrs.get("print-color-mode-supported"))
    color = any(m in color_modes for m in ("color", "auto")) if color_modes else bool(attrs.get("color-supported", True))

    # Sides
    sides = _coerce_list(attrs.get("sides-supported"))

    # Media
    raw_media = _coerce_list(attrs.get("media-supported"))
    media = _map_media(raw_media)

    # Media types
    raw_mt = _coerce_list(attrs.get("media-type-supported"))
    media_types: list[str] = []
    for mt in raw_mt:
        norm = str(mt).lower().replace("-", "").replace("_", "")
        if "plain" in norm and "plain" not in media_types:
            media_types.append("plain")
        elif "gloss" in norm and "glossy" not in media_types:
            media_types.append("glossy")
        elif "card" in norm and "cardstock" not in media_types:
            media_types.append("cardstock")

    # Number-up
    raw_nup = _coerce_list(attrs.get("number-up-supported"))
    number_up: list[int] = []
    for n in raw_nup:
        try:
            number_up.append(int(n))
        except (TypeError, ValueError):
            pass
    if not number_up:
        number_up = [1]

    # Quality
    raw_q = _coerce_list(attrs.get("print-quality-supported"))
    quality = _map_quality(raw_q)

    # Finishings
    raw_fin = _coerce_list(attrs.get("finishings-supported"))
    finishings = _map_finishings(raw_fin)

    # Collate — default True; CUPS can always collate in software
    collate = True

    # Reverse — True by default (CUPS software reverse)
    reverse = True

    # Scaling
    raw_scaling = _coerce_list(attrs.get("print-scaling-supported"))
    scaling = _map_scaling(raw_scaling)

    # Max copies
    copies_sup = attrs.get("copies-supported")
    max_copies = 99
    if copies_sup:
        try:
            raw_c = _coerce_list(copies_sup)
            max_copies = min(int(raw_c[-1]), 99)
        except (IndexError, TypeError, ValueError):
            pass

    caps = {
        "color": color,
        "sides": sides,
        "media": media,
        "media_types": media_types,
        "number_up": number_up,
        "quality": quality,
        "finishings": finishings,
        "collate": collate,
        "reverse": reverse,
        "scaling": scaling,
        "max_copies": max_copies,
    }
    return caps, make_and_model


# ── Fallback path: lpoptions -p <name> -l ───────────────────

def _discover_via_lpoptions(printer_name: str, caps: dict) -> dict:
    """Fill empty fields from lpoptions output. Never zeros out populated fields."""
    try:
        result = subprocess.run(
            ["lpoptions", "-p", printer_name, "-l"],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode != 0:
            return caps

        for line in result.stdout.splitlines():
            if ":" not in line:
                continue
            key_part, val_part = line.split(":", 1)
            key = key_part.split("/")[0].strip()
            values = [v.strip().lstrip("*") for v in val_part.strip().split()]

            if key in ("PageSize", "MediaSize") and not caps.get("media"):
                caps["media"] = _map_media(values)

            elif key == "Duplex" and not caps.get("sides"):
                side_map = {
                    "None": "one-sided",
                    "DuplexNoTumble": "two-sided-long-edge",
                    "DuplexTumble": "two-sided-short-edge",
                }
                caps["sides"] = [side_map[v] for v in values if v in side_map]

            elif key in ("ColorModel", "print-color-mode") and "color" not in caps:
                caps["color"] = any(v in ("CMYK", "RGB", "Color", "color") for v in values)

            elif key in ("Resolution", "print-quality") and not caps.get("quality"):
                # Map quality strings if present
                q_names = [v.lower() for v in values]
                q = []
                if any("draft" in v for v in q_names): q.append("draft")
                if any("normal" in v or "medium" in v for v in q_names): q.append("normal")
                if any("high" in v or "best" in v or "fine" in v for v in q_names): q.append("high")
                if q:
                    caps["quality"] = q

            elif key == "number-up" and not caps.get("number_up"):
                try:
                    caps["number_up"] = [int(v) for v in values]
                except ValueError:
                    pass

        log.info("lpoptions supplemented capabilities for %s", printer_name)
    except FileNotFoundError:
        pass
    except Exception as e:
        log.warning("lpoptions fallback failed: %s", e)

    return caps


# ── Windows stub ─────────────────────────────────────────────

def _discover_windows_stub(printer_name: str) -> tuple[dict, str | None]:
    log.info("Windows: IPP discovery not available — keeping default capabilities for %s", printer_name)
    return dict(FULL_DEFAULT), None


# ── Public entry point ────────────────────────────────────────

def discover_capabilities(printer_name: str, platform: str = "linux") -> tuple[dict, str | None]:
    """Return (capabilities_dict, make_and_model).

    Falls back to FULL_DEFAULT if discovery yields an empty/invalid set.
    Never returns an empty capability object.
    """
    if platform == "win32":
        return _discover_windows_stub(printer_name)

    caps, make_and_model = _discover_via_cups(printer_name)

    if caps is None:
        log.info("CUPS discovery failed — trying lpoptions fallback")
        caps = dict(FULL_DEFAULT)
        caps = _discover_via_lpoptions(printer_name, caps)
    else:
        # Supplement any empty fields via lpoptions
        caps = _discover_via_lpoptions(printer_name, caps)

    # Final safety net: fall back to full defaults if result is unusable
    if not is_well_formed(caps):
        log.warning(
            "Discovery result for %s is unusable (empty fields) — falling back to defaults",
            printer_name,
        )
        caps = dict(FULL_DEFAULT)

    # Ensure required keys are present even if discovery was partial
    for key, default_val in FULL_DEFAULT.items():
        if key not in caps or caps[key] is None or caps[key] == [] or caps[key] == {}:
            caps[key] = default_val

    log.info("Resolved capabilities for %s: color=%s media=%s sides=%s",
             printer_name, caps.get("color"), caps.get("media"), caps.get("sides"))
    return caps, make_and_model
