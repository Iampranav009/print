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
             "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-Printer | Select-Object Name,DriverName,PrinterStatus | ConvertTo-Json -Compress"],
            capture_output=True, text=True, encoding="utf-8-sig", timeout=15,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        if result.returncode:
            raise RuntimeError("Windows printer discovery failed. Check the Print Spooler service.")
        rows = json.loads(result.stdout) if result.stdout.strip() else []
        if isinstance(rows, dict): rows = [rows]
        return [{"name": p["Name"], "driver": p.get("DriverName"), "status": str(p.get("PrinterStatus", "unknown"))} for p in rows if p.get("Name")]
    if sys.platform == "win32":
        # EnumPrinters is available on Windows 7; Get-Printer requires Windows 8.
        import win32print
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        try:
            default = win32print.GetDefaultPrinter()
        except win32print.error:
            default = None
        return [{"name": p["pPrinterName"], "driver": p.get("pDriverName"),
                 "status": str(p.get("Status", "unknown")), "isDefault": p["pPrinterName"] == default}
                for p in win32print.EnumPrinters(flags, None, 2) if p.get("pPrinterName")]
    if sys.platform == "linux":
        import cups
        connection = cups.Connection()
        default = connection.getDefault()
        return [{"name": name, "driver": value.get("printer-make-and-model"), "isDefault": name == default}
                for name, value in connection.getPrinters().items()]
    return []
