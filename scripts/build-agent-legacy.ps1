param([string]$PythonPath)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
if (!$PythonPath) { $PythonPath = Join-Path $repo '.agent-build/legacy/pythonx86/tools/python.exe' }
if (!(Test-Path -LiteralPath $PythonPath)) { throw 'Supply -PythonPath for a CPython 3.8.10 x86 build environment with Tcl/Tk.' }
& $PythonPath -c "import struct,sys,tkinter; assert sys.version_info[:3]==(3,8,10) and struct.calcsize('P')==4, 'Legacy build requires CPython 3.8.10 x86'"
if ($LASTEXITCODE -ne 0) { throw 'Legacy runtime validation failed' }
& $PythonPath -m pip install -r (Join-Path $repo 'apps/agent/requirements-legacy-lock.txt')
if ($LASTEXITCODE -ne 0) { throw 'Legacy dependency installation failed' }
$assets = Join-Path $repo '.agent-build/legacy'
New-Item -ItemType Directory -Force $assets | Out-Null
$zip = Join-Path $assets 'sumatra-x86.zip'
if (!(Test-Path -LiteralPath $zip)) { Invoke-WebRequest -Uri 'https://www.sumatrapdfreader.org/dl/rel/3.6.1/SumatraPDF-3.6.1.zip' -OutFile $zip }
if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne '670E694A5C91633D28AB0DF689B4DBF92021183CFE82270AE552CB617A0A07ED') { throw 'PDF engine download checksum mismatch' }
Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $assets 'sumatra') -Force
Copy-Item -LiteralPath (Join-Path $assets 'sumatra/SumatraPDF-3.6.1-32.exe') -Destination (Join-Path $assets 'SumatraPDF.exe')
& $PythonPath -m PyInstaller --noconfirm --clean --onefile --windowed --noupx --name PrintBuddy-Windows7-Setup --paths (Join-Path $repo 'apps/agent') --workpath (Join-Path $assets 'work') --specpath $assets --distpath (Join-Path $repo 'apps/web/public/downloads') --hidden-import pystray._win32 --hidden-import win32print --add-binary ((Join-Path $assets 'SumatraPDF.exe')+';.') --exclude-module pyttsx3 (Join-Path $repo 'apps/agent/desktop.py')
if ($LASTEXITCODE -ne 0) { throw 'Legacy Windows app build failed' }
Get-FileHash (Join-Path $repo 'apps/web/public/downloads/PrintBuddy-Windows7-Setup.exe') -Algorithm SHA256
