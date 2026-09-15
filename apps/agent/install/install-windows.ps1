$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $env:LOCALAPPDATA 'PrintBuddy'
$configSource = Join-Path $source 'printbuddy-shop.json'
if (!(Test-Path -LiteralPath $configSource)) {
    throw 'Download your shop settings from Printer setup and put printbuddy-shop.json beside agent.py, then run setup again.'
}
$settings = Get-Content -LiteralPath $configSource -Raw | ConvertFrom-Json
if (!$settings.AGENT_TOKEN -or !$settings.PRINTBUDDY_API_BASE) { throw 'Invalid shop settings file.' }
$api = [Uri]$settings.PRINTBUDDY_API_BASE
if ($api.Scheme -ne 'https' -and !$api.IsLoopback) { throw 'Shop settings must use HTTPS.' }
# Verify the existing shop token without logging it or putting it on a command line.
Invoke-RestMethod -Uri "$($settings.PRINTBUDDY_API_BASE)/api/agent/heartbeat" -Method Post -ContentType 'application/json' -Body '{}' -Headers @{ Authorization = "Bearer $($settings.AGENT_TOKEN)" } | Out-Null
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $destination /inheritance:r /grant:r "${identity}:(OI)(CI)F" 'SYSTEM:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not protect agent settings.' }
if (Get-ScheduledTask -TaskName 'PrintBuddy Agent' -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName 'PrintBuddy Agent'
}
foreach ($entry in @('agent.py', 'config.py', 'requirements.txt', 'audio', 'printing', 'assets')) {
    Copy-Item -LiteralPath (Join-Path $source $entry) -Destination $destination -Recurse -Force
}
Copy-Item -LiteralPath $configSource -Destination (Join-Path $destination 'config.json') -Force
$python = Get-Command python.exe -ErrorAction Stop
& $python.Source -m venv (Join-Path $destination 'venv')
if ($LASTEXITCODE -ne 0) { throw 'Install Python 3.10 or later, then rerun setup.' }
$runtime = Join-Path $destination 'venv/Scripts/python.exe'
& $runtime -m pip install -r (Join-Path $destination 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check the internet connection and rerun setup.' }
$pythonw = Join-Path $destination 'venv/Scripts/pythonw.exe'
$agentPath = Join-Path $destination 'agent.py'
$action = New-ScheduledTaskAction -Execute $pythonw -Argument "`"$agentPath`"" -WorkingDirectory $destination
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName 'PrintBuddy Agent' -Action $action -Trigger $trigger -Principal $principal -Settings $taskSettings -Force | Out-Null
Start-ScheduledTask -TaskName 'PrintBuddy Agent'
Write-Host 'PrintBuddy is installed and running. It starts automatically when this Windows user signs in. Select your printer in the dashboard. Install SumatraPDF before printing.'
