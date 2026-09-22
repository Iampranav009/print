# PrintBuddy Windows app

## Shop owner setup

1. Open **Printer settings → Download / connect app**.
2. Download **PrintBuddy-Setup.exe** and open it. The app immediately discovers installed printers; pairing and printer selection are not prerequisites for discovery.
3. Generate a connection link on the website, paste it in the app, tick the installation permission, and click **Install and connect**.
4. Return to the dashboard. The list refreshes automatically. Select a black-and-white printer and either use it for color too or select a separate color printer. Click **Save printer choices**.
5. Use **Test speaker** and **Print a test page** in the app. A test page prints only when explicitly requested.

Windows 10/11 x64 is the supported build target. Install the printer's Windows driver first. The app detects installed queues (USB, Wi-Fi, network and virtual printers), not arbitrary uninstalled LAN devices or scanners. Virtual PDF printers may require an output filename and are unsuitable for unattended physical printing.

The installer bundles Python and the app dependencies. PDF printing support is downloaded directly from SumatraPDF's official site, checked against a pinned SHA-256, and stored privately with the app. No separate Python or PDF-viewer setup is required.

## Running in the background

PrintBuddy runs from the Windows notification tray. Closing the window hides it; **Quit PrintBuddy** finishes any active job and stops the app. It starts after Windows sign-in through the **PrintBuddy Agent** scheduled task and provides a Start-menu shortcut. Keep the PC awake, signed in, online, and connected to its printers. The browser/dashboard may stay closed.

A heartbeat scans and reports printers every 10 seconds independently of physical printing. The dashboard refreshes every 5 seconds. Empty discovery results clear old printers. A stale list is visibly marked, and unavailable printers are never silently substituted.

Color/B&W selections are server-side settings. Each paid job response supplies its destination printer based on the job's color option. Selecting one printer for both is supported. The existing color-enabled and duplex-enabled shop settings remain separate from destination selection.

## Connection security

Connection links expire in 10 minutes, are single-use, and are stored as SHA-256 hashes in the server-only `agent_pairings` table. A replacement link invalidates the previous outstanding link. Redeeming it replaces the device credential for the selected shop agent. The app accepts only the trusted PrintBuddy HTTPS host.

The Windows app stores its token using Windows DPAPI for the signed-in user in `%LOCALAPPDATA%/PrintBuddy/config.json`. Credentials are never bundled in the EXE or shown in the dashboard response. No inbound HTTP service or shop port forwarding is used.

## Build and release

- Build on Windows: `powershell -NoProfile -File scripts/build-agent.ps1`.
- Output: `apps/web/public/downloads/PrintBuddy-Setup.exe`.
- Build dependencies are declared in `apps/agent/requirements-build.txt`; install the frozen lock with `requirements-build-lock.txt` for repeatable builds.
- Apply `supabase/migrations/20260915041012_agent_pairing_and_printer_routing.sql` before deploying the web routes.
- Deploy the website and distribute the new EXE together. Existing shops retain their current printer for both routes after migration.
- This build is unsigned; SmartScreen or organizational policy may warn or block it. Never disable Windows protections as an installation step.
- The copy-and-paste connection link intentionally targets `print-kro-five.vercel.app`. Change `TRUSTED_HOST` in `pairing.py` when the official production domain changes and rebuild.

## Diagnostics and tests

Logs: `%LOCALAPPDATA%/PrintBuddy/agent.log` (rotated). Windows speech uses the default Windows output device and an installed voice. Linux uses the Python agent with CUPS and its speech dependencies; the EXE is Windows-only.

- Python regressions: `python -m unittest discover -s apps/agent -p "test_*.py"`.
- Packaged smoke test: `PrintBuddy-Setup.exe --self-test <absolute-json-output-path>`; no installation, pairing, payment or physical printing occurs.
- Isolated PostgreSQL migration tests: install `@electric-sql/pglite@0.3.14` under `.agent-build/test-runtime`, then run `node scripts/test-agent-migration.mjs`.
- TypeScript/build: `npm run build`.

To stop automatic startup, disable **PrintBuddy Agent** in Windows Task Scheduler. Quit the tray app before replacing its installed EXE. To remove the app, remove that task and the PrintBuddy Start-menu shortcut, then remove `%LOCALAPPDATA%/PrintBuddy` after any active job has finished.

## Windows downloads

- `PrintBuddy-Setup.exe`: Windows 10/11 x64, CPython 3.14.
- `PrintBuddy-Windows7-Setup.exe`: legacy Windows 7 SP1 x86/x64 target,
  CPython 3.8.10 x86, PyInstaller 4.10, and bundled SumatraPDF 3.6.1 x86.
  Requires applicable Windows runtime updates and an installed printer driver.
  These older runtimes are end-of-life. Windows 7 hardware acceptance testing
  is still required; do not describe the legacy release as universally verified.

The legacy agent uses the Windows spooler API for printer discovery, HKCU Run
for sign-in startup (no administrator password), and SAPI speech via PowerShell
2-compatible commands. It retains the same outbound cloud API, pairing flow,
DPAPI credential storage, and per-job printer selection. On Windows 7, startup
is at sign-in; it does not have the modern scheduled task's crash-restart policy.

Build with `scripts/build-agent-legacy.ps1 -PythonPath <python38-x86.exe>`.
The runtime must include Tcl/Tk. Pinned dependencies are in
`requirements-legacy-lock.txt`. The build verifies the official Sumatra ZIP
checksum and bundles its 32-bit engine, avoiding a second download on old PCs.
The environment used here was extracted under `.agent-build/legacy/` from the
official Python NuGet package and signed Python Tcl/Tk MSI, without installing
Python system-wide. No shop tokens are included in either download.

Verification: 21 agent tests passed under Python 3.8 x86; Tk initialization,
DPAPI round-trip, verified HTTPS, and native binary architecture/import audits
passed on the development PC. Application Control blocked the packaged EXE's
launch here; that is not a passed installer test. On a Windows 7 SP1 shop PC,
verify launch, automatic discovery, one-time pairing, speaker test, a test page,
restart/sign-in, and background printing before unattended use.

The old `python314.dll` / `api-ms-win-core-path-l1-1-0.dll` error on Windows 7
means the modern edition was used. Download the legacy edition instead; never
copy replacement DLLs from third-party sites.

Bundled component sources and licenses:
- Python: https://www.python.org/downloads/release/python-3810/ (PSF license)
- SumatraPDF: https://github.com/sumatrapdfreader/sumatrapdf/tree/3.6.1 (GPLv3)
- PyInstaller: https://pyinstaller.org/en/v4.10/license.html
