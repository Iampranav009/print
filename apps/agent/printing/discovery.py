"""Discover OS printer queues independently of pairing and selected printers."""
from __future__ import annotations
import json
import logging
import subprocess
import sys

log = logging.getLogger("printbuddy-agent")


def get_discovered_printers() -> list[dict]:
    if sys.platform == "win32" and sys.getwindowsversion().major >= 10:
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command",
             "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-CimInstance Win32_Printer | Select-Object Name,DriverName,PrinterStatus,WorkOffline,Default | ConvertTo-Json -Compress"],
            capture_output=True, text=True, encoding="utf-8-sig", timeout=15,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        if result.returncode:
            raise RuntimeError("Windows printer discovery failed. Check the Print Spooler service.")
        rows = json.loads(result.stdout) if result.stdout.strip() else []
        if isinstance(rows, dict): rows = [rows]
        return [{"name": p["Name"], "driver": p.get("DriverName"),
                 "status": "offline" if p.get("WorkOffline") or p.get("PrinterStatus") == 7 else "ready",
                 "available": not (p.get("WorkOffline") or p.get("PrinterStatus") == 7),
                 "isDefault": bool(p.get("Default"))} for p in rows if p.get("Name")]
    if sys.platform == "win32":
        # EnumPrinters is available on Windows 7; Get-Printer requires Windows 8.
        import win32print
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        try:
            default = win32print.GetDefaultPrinter()
        except win32print.error:
            default = None
        return [{"name": p["pPrinterName"], "driver": p.get("pDriverName"),
                 "status": "offline" if int(p.get("Status") or 0) & 0x80 else "ready",
                 "available": not bool(int(p.get("Status") or 0) & 0x80), "isDefault": p["pPrinterName"] == default}
                for p in win32print.EnumPrinters(flags, None, 2) if p.get("pPrinterName")]
    if sys.platform == "linux":
        import cups
        connection = cups.Connection()
        default = connection.getDefault()
        return [{"name": name, "driver": value.get("printer-make-and-model"), "isDefault": name == default,
                 "available": value.get("printer-state") != 5, "status": "stopped" if value.get("printer-state") == 5 else "ready"}
                for name, value in connection.getPrinters().items()]
    return []


def printer_availability(printer_name: str) -> tuple[bool, str]:
    """Return whether a named OS queue is installed and currently reachable."""
    try:
        printers = get_discovered_printers()
    except Exception:
        return False, "Windows could not read its printer list. Restart the Print Spooler service and try again."
    printer = next((item for item in printers if item.get("name") == printer_name), None)
    if not printer:
        return False, f'"{printer_name}" is not installed on this computer.'
    if printer.get("available") is False:
        return False, f'"{printer_name}" is offline in Windows. Turn it on, reconnect its USB or network cable, and print a Windows test page first.'
    return True, ""
