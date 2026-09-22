"""Per-user settings. Windows protects the saved credential with DPAPI."""
from __future__ import annotations
import base64
import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path
import sys

CONFIG_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home() / ".config"))) / "PrintBuddy"


class Blob(ctypes.Structure):
    _fields_ = [("size", wintypes.DWORD), ("data", ctypes.POINTER(ctypes.c_ubyte))]


def crypt(data: bytes, decrypt: bool = False) -> bytes:
    if sys.platform != "win32":
        raise RuntimeError("Windows credential protection is unavailable")
    buffer = ctypes.create_string_buffer(data)
    source = Blob(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)))
    result = Blob()
    function = ctypes.windll.crypt32.CryptUnprotectData if decrypt else ctypes.windll.crypt32.CryptProtectData
    if not function(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(result)):
        raise RuntimeError("Could not access the saved Windows credential")
    try:
        return ctypes.string_at(result.data, result.size)
    finally:
        ctypes.windll.kernel32.LocalFree.argtypes = [ctypes.c_void_p]
        ctypes.windll.kernel32.LocalFree(result.data)


def load_settings() -> dict:
    path = CONFIG_DIR / "config.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    encrypted = data.pop("AGENT_TOKEN_DPAPI", None)
    if encrypted:
        data["AGENT_TOKEN"] = crypt(base64.b64decode(encrypted), decrypt=True).decode("utf-8")
    return data


def save_settings(settings: dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    data = dict(settings)
    if sys.platform == "win32" and data.get("AGENT_TOKEN"):
        data["AGENT_TOKEN_DPAPI"] = base64.b64encode(crypt(data.pop("AGENT_TOKEN").encode())).decode("ascii")
    temporary = CONFIG_DIR / "config.json.tmp"
    with open(temporary, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)
    if sys.platform != "win32":
        temporary.chmod(0o600)
    os.replace(temporary, CONFIG_DIR / "config.json")
