# PrintBuddy — UI Build Prompt for Anti Gravity

You are building the user-facing UI for **PrintBuddy**, a QR-to-print service that turns any nearby printer into a self-serve printing kiosk. A screen next to the printer displays a QR code; the customer scans it, uploads their file, pays via Razorpay, and picks up the printout with a release code.

You are building **two surfaces**:

1. **Mobile web app** at `/app` — what the customer sees on their phone after scanning the QR.
2. **Kiosk screen** at `/kiosk/[shopId]` — the always-on display next to the printer.

Both live in the same Next.js 16 App Router project (React 19, TypeScript, Tailwind CSS v4). The backend, database (Supabase), payments (Razorpay), and print pipeline are being built in parallel — you are producing pixels, layouts, components, and client-side interactions. All server endpoints, data shapes, and auth are specified below.

---

## Design language

- **Aesthetic**: clean, white, calm, app-native. Feels like a well-crafted native iOS/Android app, not a website.
- **Background**: `#FFFFFF` on the mobile app; `#0F172A` (near-black slate) on the kiosk screen. No dark-mode toggle for the customer app — always light.
- **Primary accent**: Indigo — `#4F46E5` (bg), `#4338CA` (hover/active). Use sparingly; primary CTAs only.
- **Neutrals**: Tailwind `zinc` scale — text `zinc-900`, secondary `zinc-500`, dividers `zinc-100`, hover surfaces `zinc-50`.
- **Success**: emerald-500. **Warning**: amber-500. **Error**: red-500.
- **Type**: system font stack via Tailwind default. Headings semibold, body regular. Sizes range from `text-xs` (11px) to `text-3xl` (30px). No custom font imports.
- **Corners**: `rounded-2xl` for cards, `rounded-xl` for buttons, `rounded-full` for pills and avatars.
- **Shadow**: extremely subtle. `shadow-sm` on floating elements only.
- **Spacing**: generous. Cards `p-5`, sections `space-y-4`, page padding `px-4`.
- **Iconography**: `lucide-react` throughout — already installed.
- **Motion**: 200ms `ease-out` transitions on hover/active. No fancy animations except a `Loader2` spinner and the release-code copied checkmark.
- **Tap targets**: minimum 48px height on all interactive elements. Add `style={{ touchAction: "manipulation" }}` to buttons to kill the 300ms tap delay.
- **Safe area**: bottom bars use `env(safe-area-inset-bottom)` so they clear the iPhone home indicator.

---

## Mobile app — `/app`

Auth-guarded. If the user isn't signed in, redirect to `/login` (Google OAuth via Supabase). After sign-in, land on the Print tab.

### Shell layout

- Full viewport height, `flex flex-col`.
- **Top bar** (48px): centered title of the current tab (e.g. "Print", "Scan", "History", "Profile"). No back button — this is a tabbed app.
- **Content area**: scrollable, `overflow-y-auto`.
- **Bottom tab bar** (fixed, 64px tall + safe-area inset):
  - 4 tabs, evenly spaced: **Print**, **Scan**, **History**, **Profile**
  - Each tab is an icon + label stacked (icon 24px, label 11px).
  - Active tab: indigo icon + indigo label + a 3px indigo dot centered above the icon.
  - Inactive tab: zinc-400 icon + zinc-500 label.
  - Icons (from lucide): `Printer`, `ScanLine`, `Clock`, `User`.
  - Router: `usePathname()` decides active tab. Tabs push to `/app/print`, `/app/scan`, `/app/history`, `/app/profile`.

### Tab 1 — Print (`/app/print?shop=<shopId>`)

The whole existing print flow lives here. Route may include a `?shop=<shopId>` query — that's from the QR deep link. If missing, show empty state: an illustration and a button that goes to Scan tab.

**When a shop is selected**, render (top to bottom):

1. **Shop header card** — indigo icon square (48×48 with a printer emoji), shop name (semibold), shop location (small, zinc-500). Fetched from `GET /api/shops/[shopId]`.

2. **Upload zone** — dashed border, rounded-2xl, `p-10`. Icon: `Upload` in a rounded square. Copy: "Tap to upload your file" + "PDF · JPG · PNG • max 50 MB".
   - States: **idle**, **uploading** (spinner + progress bar with percentage), **counting** (spinner + "Reading document…"), **error** (red border + error message beneath). See data contract below.
   - Tapping opens a file picker. File type filter: `.pdf, .jpg, .jpeg, .png`.

3. **File card** (after upload) — small file icon, filename (truncated), page count, and an `X` button to reset.

4. **Options card** (after upload) — white card with rounded-2xl, dividers between sections. Sections shown depend on printer capabilities returned from `/api/shops/[shopId]`:
   - **Copies** — minus/plus buttons around a big number.
   - **Pages** — two pills side-by-side: "All N pages" / "Custom range". Custom shows an input.
   - **Color** — B&W / Colour pills (hidden if printer is mono).
   - **Orientation** — Portrait / Landscape pills.
   - **Sides** — Single / Double pills (hidden if simplex-only). If double + printer supports both edges, show a follow-up "Binding edge" section with Long / Short pills.
   - **Paper size** — one pill per supported media size.
   - **Paper type** — one pill per supported media type (hidden if only 'plain').
   - **Advanced options** (collapsible, `ChevronRight` icon rotates 90° when open): pages per sheet, quality, scaling, finishing, collate toggle, reverse toggle. Only render advanced sections that have >1 option.

   **Pill spec**: rounded-xl, min-h 46px, `px-4 py-2`. Inactive: `bg-zinc-100 text-zinc-700`. Active: `bg-indigo-600 text-white`. Some pills are 2-option binary — those get `flex-1` for equal-width side-by-side.

5. **Bottom price bar** (fixed to bottom of screen, above tab bar, safe-area inset):
   - White bg, top border, subtle upward shadow.
   - Left: price in `text-2xl font-bold` with `ChevronUp`/`ChevronDown` — tap expands a breakdown card above.
   - Right: **Pay button** — indigo, `flex-1`, min-h 54px, rounded-2xl, `text-base font-semibold`. Text: "Pay ₹123.00" (or "Opening…" with spinner while Razorpay opens). Disabled at 40% opacity when file/price not ready.
   - On tap: create job (`POST /api/jobs`), create order (`POST /api/jobs/[id]/pay`), open Razorpay via `new window.Razorpay({...})`. On success, route to `/app/history/[jobId]`.

### Tab 2 — Scan (`/app/scan`)

Full-bleed camera viewfinder. This is the in-app QR scanner alternative to using the phone's native camera.

- **Camera view**: `<video>` element playing the back camera stream via `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`.
- **QR overlay**: dim the rest of the screen with a semi-transparent black scrim, cut out a centered rounded-2xl viewfinder (~260×260px). Add 4 white L-shaped corner brackets around the viewfinder.
- **Top instructions** (above the viewfinder, white text on scrim): "Scan the QR code on the printer's screen".
- **Bottom controls** (below viewfinder): a torch/flashlight toggle (circular icon button) — only shown if `getCapabilities().torch` is available. A "Cancel" button that switches back to the Print tab.
- **On decode**: use `jsQR` (add via `npm install jsqr`). Loop `requestAnimationFrame` → grab canvas frame → decode. When a match is a URL to `/s/<shopId>` on our own origin, extract `<shopId>` and route to `/app/print?shop=<shopId>`. If the QR is unrecognized, show a red toast "This isn't a PrintBuddy code" and keep scanning.
- **Permission denied**: full-screen error state with the icon `CameraOff`, "Camera access needed to scan", and a button that opens the browser settings guidance.

### Tab 3 — History (`/app/history`)

List of the signed-in user's past print jobs.

- Fetch: `GET /api/history` → `{ jobs: Job[] }` (newest first).
- Each row: a card with a file-type icon on the left; middle column has filename + shop name (small zinc-500) + relative time ("2 hours ago"); right column has a status pill and the price.
- Status pill colors: emerald (done/printed/released), amber (payment_pending/awaiting_release/printing), red (payment_failed/print_failed), zinc (queued/cancelled).
- Tap a row → navigate to `/app/history/[jobId]` (full status detail — layout mirrors the current `/j/[jobId]` page from the existing codebase).
- Empty state: `Clock` icon in a circle, "No prints yet", subtitle "Your history will appear here after your first print", button "Start a print" → Scan tab.

### Tab 4 — Profile (`/app/profile`)

- **Header**: Google avatar (rounded-full, 80×80), display name (semibold, `text-xl`), email (zinc-500).
- **Stats row**: three tiles side-by-side — total prints, total spent, favourite shop (most-used).
- **Settings section** (rows in a card):
  - "Email notifications" toggle
  - "Marketing emails" toggle
  - "Payment methods" — chevron right → opens Razorpay-managed method list (v2, leave stub for now).
- **Danger zone**: "Sign out" (zinc button) and "Delete account" (red, destructive).
- Sign out calls `supabase.auth.signOut()` then routes to `/login`.

---

## Kiosk screen — `/kiosk/[shopId]`

- **Not** auth-guarded. Public URL. Meant to run full-screen on an inexpensive tablet or old laptop next to the printer.
- **Landscape orientation assumed**, but must gracefully re-flow to portrait.
- Background: `#0F172A` (deep slate). Text: white / zinc-200. This screen is dark by design.

### Layout — landscape

**Split 50/50 vertically:**

**Left half — QR block:**
- Centered vertically.
- Shop logo/name at top: printer emoji in an indigo rounded square (72×72), then shop name (`text-3xl font-bold text-white`), then shop location (`text-lg text-zinc-400`).
- **QR code**: rendered client-side with `qrcode.react`, encoding `https://<domain>/s/<shopId>`. Size: 340×340px. Rendered in a white rounded-3xl card with `p-6` padding. QR itself is black on white for max scannability.
- Below the QR: "Scan to print" tagline (`text-xl text-zinc-300`), and beneath it a small helper line: "Scan with your phone camera or the PrintBuddy app".

**Right half — live status area:**
- Padding `p-12`, vertically centered content.
- **When idle** (no active job): shows a soft welcome — big message "Ready when you are 🚀" (`text-5xl font-bold`), subline "Scan the QR to start your print", and an indigo pulsing dot.
- **When there's an active job**: hero card layout, `space-y-6`:
  - Icon (huge, 96×96 in a rounded-full tinted background). Per-status:
    - `payment_pending` → `Clock`, amber tint.
    - `downloading` → `Loader2` spinning, blue tint.
    - `printing` → `Printer` pulsing, blue tint.
    - `awaiting_release` → `CheckCircle2`, emerald tint.
  - Headline (`text-4xl font-bold text-white`): "Confirming payment…" / "Preparing your file…" / "Printing now…" / "Ready to collect!".
  - Sub (`text-xl text-zinc-400`): contextual copy.
  - **If awaiting_release**: enormous release code — `text-8xl font-black tracking-[0.3em] text-white`, centered, with "Release code" label above in `text-sm uppercase tracking-widest text-emerald-400`.
  - File name and job number: small, `text-sm text-zinc-500`, at the bottom.
- **Recent activity strip** (bottom of right pane): small horizontal list of the last 3 completed jobs — filename + status pill + relative time. Fades in with `opacity-70`.

### Data source

- Fetch the shop: `GET /api/shops/[shopId]` → renders logo/name/QR.
- Subscribe to the newest active job via Supabase Realtime:
  ```ts
  const channel = supabase
    .channel(`kiosk:${shopId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'print_jobs',
      filter: `shop_id=eq.${shopId}`
    }, handler)
    .subscribe();
  ```
- Client keeps state: `activeJob` = newest job whose `status` is not in the terminal set `['done','printed','payment_failed','print_failed','cancelled']`. On INSERT/UPDATE, recompute.

### Portrait fallback

Stack vertically: QR block on top, status area on bottom. Same content, resized.

---

## Auth flow

- Route `/login` — a clean centered card, PrintBuddy wordmark at top, one big button: "Continue with Google" (Google-branded per Google's guidelines — white button with the Google G logo). Below: fine print about terms/privacy.
- Click → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/app/print' }})`.
- After callback, land on `/app/print`.
- Any route under `/app` runs an auth guard (server-side check via `createServerClient`) and redirects to `/login` if unauthenticated.

---

## Data contracts (already implemented server-side; DO NOT invent shapes)

```ts
// GET /api/shops/[shopId]
type ShopResponse = {
  shop: { id: string; name: string; location: string | null; virtual_mode: boolean };
  capabilities: {
    color: boolean;
    sides: Array<'one-sided' | 'two-sided-long-edge' | 'two-sided-short-edge'>;
    media: string[];              // e.g. ['A4','A3','Letter']
    media_types: string[];        // e.g. ['plain','glossy','cardstock']
    number_up: number[];          // e.g. [1,2,4]
    quality: string[];            // e.g. ['draft','normal','high']
    finishings: string[];         // e.g. ['staple','punch']
    collate: boolean;
    reverse: boolean;
    scaling: string[];            // e.g. ['none','fit-to-page','shrink-to-fit']
    max_copies: number;
  } | null;
};

// POST /api/uploads → { signedUrl, filePath }
// POST /api/uploads/page-count → { pageCount: number }

// POST /api/price-preview → { pricePaise, breakdown: PriceBreakdown }

// POST /api/jobs → { jobId, pricePaise }
// POST /api/jobs/[jobId]/pay → { orderId }

// GET /api/jobs/[jobId] → { job: Job }
// GET /api/history → { jobs: Job[] }

type JobStatus =
  | 'queued' | 'downloading' | 'printing'
  | 'awaiting_release' | 'released' | 'printed' | 'done'
  | 'payment_pending' | 'payment_failed' | 'print_failed' | 'cancelled';

type Job = {
  id: string;
  shop_id: string;
  shop_name: string;
  user_id: string;
  status: JobStatus;
  price_paise: number;
  pages: number;
  copies: number;
  color: boolean;
  paper: string;
  duplex: boolean;
  orientation: 'portrait' | 'landscape';
  release_code: string | null;
  failure_reason: string | null;
  file_name: string;
  created_at: string;
  updated_at: string;
};
```

---

## What to ship

Produce **the pages, components, layouts, and client-side interactions**. Do not touch:
- API route handlers (already exist)
- Database schema
- Razorpay webhook handling

Do:
- Create route files under `apps/web/app/`:
  - `app/app/layout.tsx` (tab shell with auth guard)
  - `app/app/print/page.tsx`
  - `app/app/scan/page.tsx`
  - `app/app/history/page.tsx`
  - `app/app/history/[jobId]/page.tsx`
  - `app/app/profile/page.tsx`
  - `app/login/page.tsx`
  - `app/kiosk/[shopId]/page.tsx`
- Create shared components under `apps/web/components/`:
  - `TabBar`, `Pill`, `Toggle`, `ToggleRow`, `ControlSection`, `StatusPill`, `LoadingSpinner`, `EmptyState`, `QRScanner`, `KioskQR`, `KioskStatus`
- Update `apps/web/app/s/[shopId]/page.tsx` so it just redirects to `/app/print?shop=<shopId>` (through the auth guard).

Use Tailwind classes directly — no CSS modules, no styled-components. Client components are marked `"use client"` when they use state/effects. Server components (like `/app/history` initial fetch) use the Supabase server client. Package installs allowed: `jsqr`, `qrcode.react`, `@supabase/ssr` (if not already present).

Deliver production-quality, accessible (WCAG AA), keyboard-navigable, TypeScript-strict code. Every interactive element gets an `aria-label` or accessible text. Focus rings use `focus-visible:ring-2 focus-visible:ring-indigo-600`.
