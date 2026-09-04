Good question — let me actually look at the agent folder so my explanation matches what's there, not what I'd guess.

## What `apps/agent` is

A small Python program that runs **on a computer sitting at the shop, next to the printer**. It's the only piece of PrintBuddy that has to run on the shop's own hardware — everything else (Next.js web app, Supabase database, Razorpay) lives in the cloud.

Its whole job is to be the bridge between "cloud says print this" and "physical printer actually prints it". The Vercel backend can't talk to your printer directly — Vercel runs in a data centre in another country, your printer sits on your shop's local Wi-Fi behind NAT. So instead of the cloud pushing to the printer, **the agent pulls from the cloud**.

The loop it runs, forever:

1. Every few seconds, it calls `GET /api/agent/jobs/next` with its shop token
2. If there's a paid job for its shop, the API hands back the job details + a signed URL to the PDF in Supabase Storage
3. Agent downloads the PDF locally, hands it to the OS print system (CUPS on Linux / Mac, SumatraPDF on Windows) with the right options (copies, colour, duplex, paper size, page range)
4. Watches the OS print queue until the printer says "printed" or "failed"
5. Reports the result back via `POST /api/agent/jobs/[id]/status`
6. Sends a heartbeat to `/api/agent/heartbeat` so the vendor dashboard + kiosk know the printer is alive

The three modes in [agent.py](apps/agent/agent.py) exist so you can test each layer independently:
- **simulate** — pretends, useful for demos with no printer
- **virtual** — sends to CUPS-PDF (a virtual printer that saves PDFs to disk), useful for verifying CUPS options without wasting ink
- **real** — actually prints

## Why we're not running it right now

Because right now the pilot shop has `virtual_mode: true`, which flips the whole flow to server-side simulation: when the Razorpay webhook fires, [`lib/virtual-print.ts`](apps/web/lib/virtual-print.ts) itself walks the job through `dispatched → printing → printed` on a timer, and the kiosk shows the whole flow. **No agent needed for demos, testing, or your current phone-based validation.**

The agent is only required when:
- A shop flips their printer to **Real mode** in `/vendor/printer`, AND
- The connection method is **USB** (a printer plugged into a PC), OR
- You want reliable print-status reporting (paper jams, out-of-ink, etc.) on **any** printer type

For **Wi-Fi / Network** printers where the printer itself sits on the LAN with an IP, the agent is technically optional — the new `/api/vendor/printer/verify` endpoint can talk directly to the printer over port 9100. But the agent still makes things more robust because it can retry, queue, and report real print status.

## Running it on a Raspberry Pi at a shop — the full picture

The Pi is doing **two separate jobs** wearing one hat:

**Job 1: run the agent** (headless background service)
**Job 2: display the kiosk screen** (Chromium in kiosk mode on the attached monitor)

Here's the whole install path, at the level of what happens rather than exact commands:

1. **Hardware**: any Raspberry Pi 4 or 5 (2 GB RAM is plenty), an SD card with Raspberry Pi OS Desktop (32-bit or 64-bit), an HDMI monitor mounted on the wall or shelf next to the printer, keyboard just for first-time setup, and a USB cable from the Pi to the printer (or the printer joined to the same Wi-Fi as the Pi).

2. **First boot**: run through Raspberry Pi OS's setup wizard, join the shop's Wi-Fi, set the time zone. That's the last time you touch the keyboard for that Pi.

3. **Install CUPS + the printer driver**:
   - `sudo apt install cups`
   - Open `http://localhost:631` in Chromium, add the printer via CUPS's own UI (it usually finds it automatically over USB or via mDNS), test-print a page.
   - Take note of the exact name CUPS assigns — that's the string that goes into the agent's `PRINTER_NAME` env var and into `/vendor/printer` → USB tab → **OS printer name**.

4. **Deploy the agent**:
   - Copy the `apps/agent` folder to `/home/pi/printbuddy-agent`
   - Create `.env` from `.env.example` — fill in `API_BASE=https://print-kro-five.vercel.app`, `AGENT_TOKEN=<the shop's token from the admin dashboard>`, `PRINTER_NAME=<from step 3>`, `PRINT_MODE=real`
   - `pip install -r requirements.txt`
   - Install the systemd unit at [apps/agent/install/printbuddy-agent.service](apps/agent/install/printbuddy-agent.service) — this is already written for you and points at exactly the layout above. Two commands: `sudo cp install/printbuddy-agent.service /etc/systemd/system/`, then `sudo systemctl enable --now printbuddy-agent`
   - Now the agent runs at boot, restarts on crash, prints jobs the second they're paid. Within 30 s the vendor dashboard's status pill goes green.

5. **Deploy the kiosk display** on the same Pi:
   - Install Chromium (usually already there)
   - Add a systemd user service or an `~/.config/autostart/` desktop entry that launches Chromium in kiosk mode pointed at the shop's kiosk URL:
     `chromium-browser --kiosk --noerrdialogs --disable-infobars https://print-kro-five.vercel.app/kiosk/<shop-id>`
   - Optional but recommended: `sudo apt install xscreensaver` and disable screen blanking, use `unclutter` to hide the mouse cursor.
   - Reboot. Pi comes up straight into the kiosk screen full-screen on the monitor — QR on the left, live status on the right, everything we've been building.

That's the whole rig: one Pi under the counter, one HDMI cable to the wall monitor, one USB cable (or Wi-Fi) to the printer, one power supply. Total hardware cost per shop: ~₹6,000–8,000 for a new Pi + monitor + cables, or free if the shopkeeper already has an old laptop.

## The mental model for "which piece does what"

```
CUSTOMER PHONE          THE INTERNET                      SHOP HARDWARE
─────────────────       ──────────────────────────        ──────────────────────
Scan QR                                                   ┌─ Monitor ────┐
Upload PDF   ──HTTPS──▶ Vercel (Next.js)                  │ Kiosk screen │
Pay Razorpay ──────────▶ Supabase (DB + Storage)          │ (Chromium)   │
                        Razorpay webhook                  └──────────────┘
                                │                                  ▲
                                │                                  │ HDMI
                                ▼                                  │
                        DB status: dispatched              ┌─────────────┐
                                │                          │ Raspberry   │
                        pulled every 3s ─────────────────▶ │ Pi (agent)  │
                                                           └─────────────┘
                                                                   │ USB or Wi-Fi
                                                                   ▼
                                                           ┌─────────────┐
                                                           │  Printer    │
                                                           └─────────────┘
```

The customer's phone never touches the Pi. The Pi never talks to the customer's phone directly. Everything they share goes through the cloud, and the agent is the piece that translates cloud state into paper coming out of a printer.

## What you don't have to do right now

- Nothing. Your current setup (test mode, virtual printer, phone → Vercel → phone flow) is a complete demo. You can onboard vendors, take payments, show them the History screen, everything.
- The agent + Pi step is what you do **at each shop when you actually go install PrintBuddy there** — a physical rollout activity, not a development activity.
- If you want to test the real agent path yourself before rolling out, you can install CUPS on any Linux laptop, plug in any old printer, run `PRINT_MODE=simulate` or `virtual`, and watch the whole loop end-to-end from your desk without spending on hardware.