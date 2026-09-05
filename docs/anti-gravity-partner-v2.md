# PrintBuddy — Partner Dashboard v2

You're evolving the existing **Vendor Dashboard** into the **Partner Dashboard**. Everywhere the current UI says "Vendor" it should read "Partner" — same account, same routes, same person, better name. Also adding three concrete features: a wallet chip in the top nav, printer feature toggles + custom pricing on the printer page, and an auto-populated OS-printer-name dropdown that reads from the local agent.

**Do not touch the admin dashboard for this pass.** Only the partner side.

The backend for all of this already exists. Data contracts at the bottom.

---

## 1. Rename Vendor → Partner (labels only, no URL changes)

Change every user-visible occurrence of the word "vendor" to "partner" (or "Partner" in headings, "partner" mid-sentence). Do not rename files, routes, imports, DB tables, or API paths — the `/vendor/*` URLs and `/api/vendor/*` endpoints stay as-is. This is a copy pass; the account object is called `partner` from now on.

Concrete places to change (not exhaustive — search the vendor tree):

- Sidebar header ("Seller" or "Vendor" → "Partner")
- Top bar title on `/vendor/*` pages
- Sidebar nav labels (e.g. keep "Overview", "Analytics", etc., but change any section labelled "Vendor …")
- Onboarding wizard copy
- Invite claim page copy ("Sign in to become a vendor" → "Sign in to become a partner")
- Bank details page: "Vendor bank details" → "Partner bank details"
- Anywhere `role: "vendor"` renders in UI copy
- Existing "Vendor Portal" wordmark next to the printer logo

Router-side: add a soft redirect `/partner/*` → `/vendor/*` (Next.js route config or `middleware.ts`) so future partner-typed URLs still work. Optional; not strictly required.

---

## 2. Wallet chip in the top nav

Add a compact wallet element to the right side of `AppTopBar` (or whatever your current top-bar component is called under `/vendor/layout.tsx`). Sits between the shop name badge and the account avatar.

**Visual**
- Pill shape, `rounded-full`, `bg-white border border-zinc-200 shadow-sm`
- `Wallet` icon from lucide-react on the left, subtle green (`text-emerald-600`)
- Amount label on the right in `font-semibold tabular-nums text-zinc-900`: `₹1,234.00` — format from `available_paise`
- Whole pill is a link to `/vendor/payouts`
- On hover: `bg-zinc-50` and a tiny caption below the amount reads "Available to withdraw" (optional tooltip)

**Empty state** — if `available_paise === 0` show a muted pill: label reads "₹0.00" in `text-zinc-500`.

**No verified bank** — pill still shows the number, but add a tiny amber dot indicator to the wallet icon and the tooltip says "Add bank details to enable payout".

**Data** — client-side fetch:
```ts
const wallet = await fetch("/api/vendor/wallet").then(r => r.json());
```
Poll every 60s or refetch on route change so it stays roughly fresh. Response shape below.

Skeleton placeholder while loading (grey pill with shimmer).

---

## 3. Printer feature toggles

On `/vendor/printer` (partner-facing printer page), add a **"What customers can print"** section — a card above the Connectivity card:

Three toggle rows using the existing `ToggleRow` + `Toggle` primitives (from `components/vendor/`) — or if those don't exist yet, standard on/off switches like the ones on the Profile page. Layout: label + short helper left, toggle right.

- **Black & white print** — always on, toggle disabled (greyed out) with a small "Always on" pill next to it. Helper: "Base offering — cannot be turned off."
- **Colour print** — bound to `printer.color_enabled` (defaults `true`). Helper: "Let customers choose colour output. Uses the colour-per-page price below."
- **Double-sided print** — bound to `printer.duplex_enabled` (defaults `true`). Helper: "Let customers print both sides of the paper. Duplex factor below controls the discount."

Save behaviour:
- Debounce 400ms, then `PUT /api/vendor/printer` with the changed flag(s) — same endpoint that already handles the mode toggle
- Optimistic — flip immediately, revert on error
- Toast on success: "Colour print enabled" / "Colour print disabled" etc.

---

## 4. Pricing card

New card on `/vendor/printer` below the feature toggles: **"Pricing"**. Or lift it into its own route `/vendor/pricing` if you prefer — matter of nav taste; content is the same either way.

Fields (all rendered as numeric inputs, prefixed with **₹**, with a two-decimal display; store internally as paise integers):

1. **Black & white per page** — `bw_page_paise` — default 2.00
2. **Colour per page** — `color_page_paise` — default 10.00 — disabled + greyed if `color_enabled === false`
3. **Duplex factor** — `duplex_factor` — decimal 0.10 – 2.00 — default 1.00 — disabled if `duplex_enabled === false`. Helper: "Multiplied against the per-page price when the customer picks double-sided. 0.9 means 10% cheaper; 1.0 means no discount."
4. **A3 multiplier** — `a3_multiplier` — decimal 1 – 10 — default 2.00 — helper: "A3 pages cost this multiple of an A4 page."
5. **Minimum charge** — `min_charge_paise` — default 3.00 — helper: "Every order is at least this much."

Layout: 2-column grid on desktop, stacked on mobile. Each row shows label + numeric input + helper.

Save button at the bottom of the card, `bg-indigo-600`. Calls `PUT /api/vendor/pricing` with only the fields that changed (or all of them — endpoint accepts partial updates). On success: toast "Pricing updated" and refetch.

Add a live "Example price" preview above the save button that shows what a 5-page A4 job would cost with the current settings:
`5 pages × ₹2.00 B&W = ₹10.00 (min charge ₹3.00 does not apply)` — recompute client-side as inputs change so the partner sees exactly what customers will be charged.

---

## 5. Printer name dropdown (auto-fetched)

Rework the "OS printer name" field in the connectivity Configure modal (`components/vendor/PrinterConfigModal.tsx`) into a **Combobox** — dropdown of discovered printer names with an "Or type a name" fallback input at the bottom.

**Data source** — the response of `GET /api/vendor/printer` now includes:
```ts
discovered_printers: Array<{ name: string; driver: string | null; isDefault: boolean }>
discovered_at:      string | null    // ISO timestamp of the last agent report
```

**UX**
- If `discovered_printers.length > 0`:
  - Render a native `<select>` (or your existing dropdown component) at the top of the field. First option: `— Select a printer —`. Then one option per discovered printer, showing `name` in bold and `driver` in muted small text underneath. Mark the `isDefault: true` one with a tiny "Default" pill.
  - Below the dropdown, a subtle caption: "Auto-detected from your PrintBuddy agent (last updated 2 min ago)" — relative time from `discovered_at`.
  - Below that, an expandable "Type manually" section for cases where the printer isn't discovered yet.
- If `discovered_printers.length === 0`:
  - Show a warning card instead of the dropdown: `bg-amber-50 border border-amber-200 rounded-xl p-4`. Icon `AlertCircle`. Copy: "No printers detected yet. Install and start the PrintBuddy agent on the shop machine, or type the printer name manually below."
  - Below the card, show the manual text input directly.

On modal Save: `os_printer_name` from the selected option (or the manually typed value) goes into `PUT /api/vendor/printer` alongside the other connection fields as before.

---

## 6. Sidebar order

Reorder the partner sidebar so the most-used items are first:

1. Overview
2. Analytics
3. **Wallet** ← new item (route `/vendor/payouts` — page already exists)
4. Shop
5. Printer
6. Bank
7. Profile

Icons: `Wallet` from lucide-react for the new item.

---

## Data contracts (already implemented server-side — do not invent shapes)

```ts
// GET /api/vendor/wallet
type WalletResponse = {
  currency: "INR";
  available_paise:       number;   // what the pill shows
  lifetime_earned_paise: number;   // for the tooltip / /vendor/payouts detail
  withheld_paise:        number;   // pending/approved/paid requests
  can_withdraw:          boolean;  // available > 0 AND bank verified
  bank_verified:         boolean;
};

// GET /api/vendor/printer  (now returns two extra top-level fields)
type PrinterResponse = {
  shop:   { id: string; name: string; virtual_mode: boolean };
  printer: {
    id: string;
    mode: "test" | "real";
    connection_type: "wifi" | "usb" | "network" | null;
    host: string | null;
    port: number | null;
    wifi_ssid: string | null;
    os_printer_name: string | null;
    setup_notes: string | null;
    last_seen_at: string | null;
    online: boolean;
    color_enabled: boolean;    // ← NEW
    duplex_enabled: boolean;   // ← NEW
  } | null;
  agent: { id: string; status: string; last_heartbeat: string | null;
           platform: string | null; agent_token: string } | null;
  status: {
    mode: "test" | "real";
    online: boolean;
    last_seen_at: string | null;
    heartbeat_window_seconds: number;
  };
  discovered_printers: Array<{                // ← NEW
    name: string;
    driver: string | null;
    isDefault: boolean;
  }>;
  discovered_at: string | null;                // ← NEW
};

// PUT /api/vendor/printer  (extra optional body fields)
type PrinterUpdate = {
  mode?: "test" | "real";
  connection_type?: "wifi" | "usb" | "network" | null;
  host?: string | null;
  port?: number | null;
  wifi_ssid?: string | null;
  os_printer_name?: string | null;
  setup_notes?: string | null;
  color_enabled?: boolean;   // ← NEW
  duplex_enabled?: boolean;  // ← NEW
};

// GET /api/vendor/pricing
type PricingResponse = {
  pricing: {
    shop_id: string;
    bw_page_paise: number;
    color_page_paise: number;
    a3_multiplier: number;
    duplex_factor: number;
    min_charge_paise: number;
    media_type_surcharges: Record<string, number>;
  };
};

// PUT /api/vendor/pricing — partial update, all fields optional
type PricingUpdate = {
  bw_page_paise?: number;
  color_page_paise?: number;
  duplex_factor?: number;
  a3_multiplier?: number;
  min_charge_paise?: number;
};
```

---

## Things NOT to touch

- Admin dashboard (`/dashboard/*`) — explicitly out of scope
- Kiosk (`/kiosk/*`) — untouched
- Customer app (`/app/*`) — untouched
- URL paths (`/vendor/*`) — copy pass only
- Database schemas — migration 0018 already handles the new columns

---

## What you'll ship

- Copy pass: Vendor → Partner across the `/vendor/*` tree
- `components/vendor/WalletChip.tsx` — new component for the top nav
- Update to `components/vendor/AppTopBar` (or equivalent) to render the chip
- Update to `components/vendor/VendorSidebar.tsx`: rename brand, reorder, add Wallet
- Update to `app/vendor/printer/printer-client.tsx`: add the Features + Pricing cards
- Update to `components/vendor/PrinterConfigModal.tsx`: dropdown from discovered_printers with manual fallback
- New `app/vendor/pricing/` page IF you split pricing off (optional — inline on printer page is also fine)

The backend is done. Wire it up.
