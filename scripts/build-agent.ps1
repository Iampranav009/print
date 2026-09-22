$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$python = Join-Path $repo '.venv-agent-build/Scripts/python.exe'
if (!(Test-Path -LiteralPath $python)) {
    python -m venv (Join-Path $repo '.venv-agent-build')
    if ($LASTEXITCODE -ne 0) { throw 'Could not create build environment.' }
}
# Keep the published OS/architecture contract reproducible, even when the
# developer's default Python or a pre-existing virtualenv changes.
& $python -c "import struct,sys; sys.exit(0 if sys.platform == 'win32' and sys.version_info[:2] == (3,14) and struct.calcsize('P') == 8 else 'Build requires CPython 3.14 x64; this release targets Windows 10/11 x64, not Windows 7.')"
if ($LASTEXITCODE -ne 0) { throw 'Incompatible build interpreter. Create the build environment with CPython 3.14 x64.' }
& $python -m pip install -r (Join-Path $repo 'apps/agent/requirements-build-lock.txt')
if ($LASTEXITCODE -ne 0) { throw 'Could not install build dependencies.' }
& $python -m PyInstaller --noconfirm --onefile --windowed --noupx --name PrintBuddy-Setup --paths (Join-Path $repo 'apps/agent') --workpath (Join-Path $repo '.agent-build/work') --specpath (Join-Path $repo '.agent-build') --distpath (Join-Path $repo 'apps/web/public/downloads') --hidden-import pystray._win32 --exclude-module pyttsx3 (Join-Path $repo 'apps/agent/desktop.py')
if ($LASTEXITCODE -ne 0) { throw 'Windows app build failed.' }
Get-FileHash (Join-Path $repo 'apps/web/public/downloads/PrintBuddy-Setup.exe') -Algorithm SHA256
