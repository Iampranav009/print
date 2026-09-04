# PrintBuddy — Vendor Printer Page + Config Modal UI Prompt

You're extending the vendor portal at `/vendor/*` with a new **Printer** section: a test/real mode toggle, printer configuration (Wi-Fi / USB / Network via a modal), a "Verify connectivity" button, and a persistent connection status indicator in the vendor top nav.

Same tech stack as the rest of the vendor portal — Next.js 16 App Router, React 19, Tailwind v4, lucide-react, `@supabase/ssr`. All backend endpoints already exist and are documented at the end of this doc.

Do **not** touch the customer app (`/app/*`), `/login`, `/kiosk/*`, or `/s/*`.

---

## Where this fits in the sidebar

Add a **Printer** row to the existing `VendorSidebar` between "Shop" and "Bank details" (or wherever the existing order makes sense). Icon: `Printer` from lucide-react. Route: `/vendor/printer`.

The vendor's landing page after login is `/vendor` (analytics). This is a per-request from the user — analytics comes first on the dashboard. Nothing else about the sidebar changes.

---

## `/vendor/printer` — page layout

Standard vendor content grid, `max-w-3xl`, `space-y-6`.

### 1. Mode card (top)

Big segmented control: **Test** · **Real**.

Copy:
- Card title: **"Printer mode"** (`text-lg font-semibold`)
- Sub: *"Test mode uses PrintBuddy's virtual printer — pay-per-print flow works end-to-end without real hardware. Switch to Real to connect the printer at your shop."*
- The segmented control below sub, ~360px wide.
- Both options render as pills; active pill has `bg-zinc-900 text-white`, inactive is `bg-zinc-100 text-zinc-600`. Padding `py-2 px-5`.
- To the right of the segmented control, a small **Status pill** — reflects the derived online/offline state (green dot + "Online" or red dot + "Offline"). In Test mode always green + "Test mode".

Toggling calls `PUT /api/vendor/printer` with `{ mode: "test" | "real" }`. Show an optimistic toast **"Switched to test mode"** / **"Switched to real mode"**. On real → test switch, keep the connection config values in the DB — vendor may switch back.

### 2. Connectivity card (below Mode)

Shown ONLY when mode = "real".

Layout:
- Card title: **"Connectivity"**
- Sub: reflects current state. Examples:
  - Not configured yet → *"No connection details saved. Configure the printer to start receiving jobs."*
  - Configured & online → *"Printer is online. Last seen X seconds ago."*
  - Configured & offline → *"Printer isn't responding. Check power, cable and network, then retry."*
- Two side-by-side buttons:
  - **Configure printer** — indigo-600, opens the config modal (below)
  - **Verify connectivity** — outline button, calls `POST /api/vendor/printer/verify` and shows the response in a small inline block underneath. Green background on ok, red on error, with the message text.

Below the buttons show a small definition-list style summary of saved fields:
- Connection type (Wi-Fi / USB / Network)
- Host / IP (for Wi-Fi & Network)
- Port (for Wi-Fi & Network; default 9100)
- OS printer name (for USB)
- Wi-Fi network (for Wi-Fi)

If nothing saved, hide the list and show a soft placeholder.

### 3. Setup guide (below Connectivity)

Shown ONLY when mode = "real" and there's no config yet. Card with 3 numbered steps that lift straight from the config modal's instructions:

1. **Pick your connection method** — Wi-Fi is easiest for modern printers, USB for older ones plugged into a PC.
2. **Note the printer's IP / name** — visible on the printer's touchscreen or in Windows Print Spooler / macOS Printers & Scanners.
3. **Enter it in Configuration** — click Configure printer above.

---

## Config modal

Opened by the "Configure printer" button. Overlay dialog, max width 560px, `rounded-3xl`, `p-8`, white bg, backdrop `bg-black/40`.

Header:
- Title **"Configure printer"** (`text-xl font-bold`)
- Sub *"Choose how your printer connects to PrintBuddy."*
- Close button (`X` icon) top-right

**Tabs** (segmented control): **Wi-Fi** · **USB** · **Network**. Default to whatever is currently saved, otherwise Wi-Fi.

### Wi-Fi tab

*"Most modern printers can be joined to your shop's Wi-Fi from their front panel. Once joined, they show an IP address on the settings screen — enter it below."*

Fields:
- **Wi-Fi network name (SSID)** — text, optional (reference only)
- **Printer IP address** — required, placeholder `192.168.1.42`
- **Port** — number input, default `9100`, helper *"9100 is the standard raw JetDirect port used by nearly every network-capable printer."*

Below the fields, a collapsed instructions accordion (`ChevronRight` rotates 90° on open) titled **"How to find your printer's IP"** with these bullets:
- Look at the printer's front panel → Settings → Network → check the IPv4 address.
- HP printers: press the wireless button, then the info button.
- Canon / Epson: Settings → Network Status → Print Status Sheet.
- Brother: Menu → Network → TCP/IP → IP Address.
- If you don't see one, the printer isn't joined to Wi-Fi yet — do that first from the printer's own menu.

### USB tab

*"For a printer plugged into a PC or Raspberry Pi over USB. You'll need to run the PrintBuddy Agent app on that machine — it forwards jobs to the printer over your OS's print system."*

Fields:
- **OS printer name** — required, placeholder `HP_LaserJet_Pro_MFP_M148fw`, helper *"The exact name your operating system uses for the printer. Windows: Control Panel → Devices and Printers. macOS: System Settings → Printers & Scanners. Linux: `lpstat -p`."*

Below, expanded instructions block:
1. Install the PrintBuddy Agent (link: `/vendor/agent-download` — placeholder for now).
2. When it starts, paste in the shop's **Agent Token** (visible in your Shop settings) and click Connect.
3. The agent runs quietly in the background, sends heartbeats every 30 seconds, and forwards paid print jobs to the OS printer above.
4. Back on this page, click **Verify connectivity** — the status pill should turn green.

### Network tab

*"For enterprise or shared network printers that already sit on your LAN with a static IP."*

Fields:
- **IP address or hostname** — required, placeholder `printer.shop.local` or `10.0.0.15`
- **Port** — number input, default `9100`

Below, a one-line note: *"If your network printer uses a different protocol (LPD, IPP), let PrintBuddy support know and we'll add support."*

### Modal footer

- **Cancel** (outline, dismisses without saving)
- **Save configuration** (indigo-600, primary)

On save: `PUT /api/vendor/printer` with the mapped body:
```ts
{
  connection_type: "wifi" | "usb" | "network",
  host: string | null,        // wifi / network tabs
  port: number | null,        // wifi / network tabs
  wifi_ssid: string | null,   // wifi tab only
  os_printer_name: string | null, // usb tab only
}
```

On success: close modal, refresh the parent page's data, show toast **"Printer configuration saved"**, and auto-trigger a Verify call to update the status pill.

On error: keep modal open, show error inline at the top of the modal in a red banner.

---

## Top-nav status pill (persistent, all vendor pages)

In `VendorTopBar`, add a small pill on the right side, before whatever's already there:

- **Test mode** — indigo-100 bg, indigo-700 text, `Printer` icon
- **Online** — emerald-100 bg, emerald-700 text, green dot before label
- **Offline** — red-100 bg, red-700 text, red dot pulsing before label
- **Not configured** — zinc-100 bg, zinc-600 text, plain dot

Fetches from `GET /api/vendor/printer` on mount and every 30s. Clicking the pill routes to `/vendor/printer`.

---

## Data contracts

```ts
// GET /api/vendor/printer  → 
type PrinterInfoResponse = {
  shop: { id: string; name: string; virtual_mode: boolean };
  printer: {
    id: string;
    os_printer_name: string;
    make_and_model: string | null;
    mode: "test" | "real";
    connection_type: "wifi" | "usb" | "network" | null;
    host: string | null;
    port: number | null;
    wifi_ssid: string | null;
    setup_notes: string | null;
    last_seen_at: string | null;
    online: boolean;
    // ... capabilities fields, ignore for this page
  } | null;
  agent: { id: string; status: string; last_heartbeat: string; platform: string } | null;
  status: {
    mode: "test" | "real";
    online: boolean;
    last_seen_at: string | null;
    heartbeat_window_seconds: number;   // 90
  };
};

// PUT /api/vendor/printer  body: partial PrinterConfigBody, returns { ok, printer_id }
type PrinterConfigBody = {
  mode?: "test" | "real";
  connection_type?: "wifi" | "usb" | "network" | null;
  host?: string | null;
  port?: number | null;
  wifi_ssid?: string | null;
  os_printer_name?: string | null;
  setup_notes?: string | null;
};

// POST /api/vendor/printer/verify  →
type VerifyResponse = {
  ok: boolean;
  mode: "test" | "real";
  connection_type?: "wifi" | "usb" | "network" | null;
  host?: string;
  port?: number;
  message: string;   // human-readable — safe to show verbatim
  last_heartbeat_at?: string | null;
};
```

The verify endpoint opens a TCP socket to `host:port` with a 3s timeout for Wi-Fi and Network configurations. For USB it checks the agent's heartbeat window (90s). For Test mode it always returns `ok: true` immediately.

---

## Files to create

Under `apps/web/`:
- `app/vendor/printer/page.tsx` — main page (server component to fetch initial state, wraps a client component for interactive bits)
- `app/vendor/printer/printer-client.tsx` — client wrapper: state, modal, verify handler
- `components/vendor/PrinterModeToggle.tsx` — segmented control
- `components/vendor/PrinterConfigModal.tsx` — the three-tab modal
- `components/vendor/PrinterStatusPill.tsx` — reusable pill for both the page and VendorTopBar

Extend:
- `components/vendor/VendorSidebar.tsx` — add the Printer row
- `components/vendor/VendorTopBar.tsx` — mount `PrinterStatusPill` on the right

Do NOT add any package dependencies — everything above uses what's already installed.

---

## Copy tone

Clear, actionable, no jargon unless immediately explained. Never say "endpoint" or "API" — say "PrintBuddy". Never say "the backend" — say "PrintBuddy". Fields have visible units in helpers (e.g. "port", "IP address"). Errors state what to do next, not what went wrong internally.
