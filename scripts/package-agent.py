"""Build a credential-free source distribution for the shop setup page."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
source = root / "apps/agent"
target = root / "apps/web/public/downloads/PrintBuddyAgent.zip"
target.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(target, "w", ZIP_DEFLATED) as archive:
    for path in sorted(source.rglob("*")):
        relative = path.relative_to(source)
        if path.is_file() and (
            relative.parts[0] in {"audio", "printing", "assets", "install"}
            or str(relative) in {"agent.py", "config.py", "local_settings.py", "desktop.py", "pairing.py", "windows_setup.py", "requirements.txt", "Install.cmd"}
        ) and "__pycache__" not in relative.parts:
            archive.write(path, "PrintBuddyAgent/" + relative.as_posix())
print(f"Built {target.name}")
