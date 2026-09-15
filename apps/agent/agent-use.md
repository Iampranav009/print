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
