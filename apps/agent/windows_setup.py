"""Install the signed-in user's app and autostart without administrator privileges."""
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile
import requests
from local_settings import CONFIG_DIR

SUMATRA_URL = "https://www.sumatrapdfreader.org/dl/rel/3.6.1/SumatraPDF-3.6.1-64.zip"
SUMATRA_SHA256 = "98b33a518d42986856d225064b0cd2d3643ecf78cbf84ab873d26cc51877a544"


def powershell(script: str, payload: dict | None = None) -> None:
    result = subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", "$ErrorActionPreference='Stop'; " + script],
                            input=json.dumps(payload or {}), text=True, capture_output=True, timeout=45,
                            creationflags=subprocess.CREATE_NO_WINDOW)
    if result.returncode:
        raise RuntimeError("Windows could not finish setup. Check your account permissions and try again.")


def ensure_print_support() -> Path:
    target = CONFIG_DIR / "SumatraPDF.exe"
    if target.exists():
        return target
    response = requests.get(SUMATRA_URL, timeout=90)
    response.raise_for_status()
    if hashlib.sha256(response.content).hexdigest() != SUMATRA_SHA256:
        raise RuntimeError("The PDF printing download could not be verified. Please contact support.")
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        names = [name for name in archive.namelist() if Path(name).name.lower().endswith('.exe')]
        if len(names) != 1:
            raise RuntimeError("Unexpected PDF printing package.")
        data = archive.read(names[0])
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    temporary = CONFIG_DIR / "SumatraPDF.exe.tmp"
    temporary.write_bytes(data)
    os.replace(temporary, target)
    return target


def install_app() -> Path:
    if not getattr(sys, "frozen", False):
        raise RuntimeError("Use the Windows download to install PrintBuddy.")
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    destination = CONFIG_DIR / "PrintBuddy.exe"
    if Path(sys.executable).resolve() != destination.resolve():
        try:
            shutil.copy2(sys.executable, destination)
        except PermissionError:
            raise RuntimeError("PrintBuddy is already open. Quit it from the Windows tray, then reopen this installer.") from None
    ensure_print_support()
    return destination


def register_startup(executable: Path) -> None:
    powershell("""
      $p=[Console]::In.ReadToEnd() | ConvertFrom-Json;
      $user=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name;
      $action=New-ScheduledTaskAction -Execute $p.exe -Argument '--background' -WorkingDirectory $p.directory;
      $trigger=New-ScheduledTaskTrigger -AtLogOn -User $user;
      $principal=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited;
      $settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew;
      Register-ScheduledTask -TaskName 'PrintBuddy Agent' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null;
      $shell=New-Object -ComObject WScript.Shell;
      $shortcut=$shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Programs')) 'PrintBuddy.lnk'));
      $shortcut.TargetPath=$p.exe; $shortcut.WorkingDirectory=$p.directory; $shortcut.Save();
    """, {"exe": str(executable), "directory": str(CONFIG_DIR)})


def start_installed() -> None:
    # Start via the task so Windows can restart a failed process.
    powershell("Start-ScheduledTask -TaskName 'PrintBuddy Agent'")


def uninstall_startup() -> None:
    powershell("Unregister-ScheduledTask -TaskName 'PrintBuddy Agent' -Confirm:$false -ErrorAction SilentlyContinue")
