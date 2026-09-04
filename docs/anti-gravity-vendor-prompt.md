# PrintBuddy — Vendor Portal & Admin Extensions UI Prompt

You're extending the PrintBuddy app with a **vendor portal** (`/vendor/*`) — the seller-side dashboard where a print-shop owner manages their shop, printer location, bank details, and sees analytics on prints and revenue. You're also adding **admin extensions** to the existing `/dashboard` for creating shops and generating vendor invite links.

The mobile customer app (`/app/*`), login (`/login`), and kiosk (`/kiosk/*`) already exist and are shipping — do not touch them.

Same tech stack as before: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, `lucide-react` icons, `@supabase/ssr` for auth, `qrcode.react` and `jsqr` already installed. All backend APIs, auth wiring, migrations, and middleware are already built — you're producing pixels + client-side interactions.

---

## Vendor identity model — read this before anything else

- **Same Google OAuth as the customer app**. There is no separate vendor login.
- A user becomes a vendor when an admin generates an invite for a shop, the vendor opens the claim URL, signs in with Google, and their `user_id` is bound to that shop as `shops.owner_id`.
- Middleware already gates `/vendor/*` behind auth. Your layouts do the rest.
- After sign-in on the login page, `/api/vendor/me` tells you whether the user is a vendor and whether they've completed onboarding.

---

## Design language

Same clean-white aesthetic as the mobile app. **Vendor portal is desktop-first** (business tool, sellers will use laptops) but must remain usable on tablet and phone.

- Background: `#FFFFFF`. Content areas on `#FAFAFA` (`bg-zinc-50`).
- Primary accent: indigo — `#4F46E5` (bg), `#4338CA` (hover).
- Neutrals: Tailwind `zinc` — text `zinc-900`, secondary `zinc-500`, dividers `zinc-100`.
- Success emerald-500, warning amber-500, error red-500.
- Cards `rounded-2xl`, buttons `rounded-xl`, avatars `rounded-full`.
- `shadow-sm` on cards; no heavy shadows.
- Type: system font stack. Section headings `text-lg font-semibold`, tile numbers `text-3xl font-bold tabular-nums`.
- Tables use zebra-free rows with `border-b border-zinc-100`. No borders on outer edges.
- Icons: lucide-react everywhere.
- Motion: 200ms transitions on hover. Charts fade in.
- Accessibility: keyboard-navigable, focus rings `focus-visible:ring-2 focus-visible:ring-indigo-600`.

---

## Vendor portal shell — `/vendor/layout.tsx`

- Server component. Uses `createClient()` from `@/lib/supabase/server` to `getUser()`.
- If no user, `redirect("/login?next=/vendor")`.
- Fetches `GET /api/vendor/me` server-side (or forwards cookies). If `onboarded === false || hasShop === false`, `redirect("/vendor/onboarding")`.
- Otherwise wraps children with the sidebar + top bar.

**Layout structure** (desktop):
- Full-height 2-column grid: **sidebar** (240px) + **content**.
- Sidebar (left):
  - Top: PrintBuddy wordmark + small "Seller" tag.
  - Nav sections, each with icon + label, showing active state as indigo bg + white text:
    - `Overview` (LayoutDashboard) → `/vendor`
    - `Analytics` (BarChart3) → `/vendor/analytics`
    - `Shop` (Store) → `/vendor/shop`
    - `Printer location` (MapPin) → `/vendor/location`
    - `Bank details` (Landmark) → `/vendor/bank`
    - `Profile` (User) → `/vendor/profile`
  - Bottom of sidebar: avatar + name + email, click opens a small menu with "Sign out".
- Top bar (spans right column, ~64px): page title on the left, live shop badge on the right — small pill showing shop name + a status dot (emerald if `shop.status === "active"`, amber if pending, red if suspended).
- Content: `px-8 py-6 max-w-6xl`.

**Tablet / phone fallback**: sidebar collapses to a hamburger drawer, top bar keeps title, content full-width `px-4 py-4`.

---

## Onboarding wizard — `/vendor/onboarding/page.tsx`

Client component. A first-time vendor lands here whenever `onboarded=false` or `hasShop=false`.

- Center-stage card, max width 560px, `bg-white rounded-3xl shadow-md p-8`.
- Step indicator at the top: three dots + labels — **Profile** · **Shop** · **Bank** (last one skippable).
- Progressive form:
  1. **Profile step** — full name (required), phone (required, 10-digit Indian format), address (optional textarea). "Continue" calls `PUT /api/vendor/me`.
  2. **Shop step** — asks: "Have you been invited to a shop? Paste your invite link or token." Input + "Claim shop" button — extracts `?token=…` if URL, else uses the raw text. Calls `POST /api/vendor/claim { token }`. On success: show the shop name + location + "Continue". If they say "I don't have one," show a card explaining they need to contact PrintBuddy for an invite.
  3. **Bank step** — collects `account_holder_name`, `account_number`, `ifsc_code` (auto-uppercase, live IFSC format check `^[A-Z]{4}0[A-Z0-9]{6}$`), `bank_name` (optional), `upi_id` (optional). "Save" calls `PUT /api/vendor/bank`. Also has a "Skip for now" link that goes straight to `/vendor` — bank isn't required to receive orders, only to receive payouts.
- On completion, router.push to `/vendor`.

---

## `/vendor` — Overview dashboard

Server component fetches `GET /api/vendor/analytics?period=day` and `GET /api/vendor/me` in parallel and renders:

**Top row — 4 stat tiles, `grid grid-cols-2 md:grid-cols-4 gap-4`:**
- **Prints today** — big number, subline "vs. yesterday +X%" (compute from series).
- **Revenue today** — formatted rupees (`formatPaise`), same +X% subline.
- **Colour vs B&W** — inline bar or two small numbers with tiny bars beneath: emerald for colour, zinc for B&W.
- **Live jobs** — count of jobs in status `dispatched|printing|awaiting_release`. Real-time via Supabase Realtime (`postgres_changes` on `print_jobs` filtered by `shop_id`).

**Middle row — Recent jobs table (last 10 from analytics.recent):**
- Columns: file name, pages × copies, color chip (indigo for Colour, zinc for B&W), amount, status pill (reuse the `<StatusPill>` component), time.
- Empty state: soft illustration + "No prints yet — share your QR code to get started" + a "View QR" button that opens `/kiosk/<shopId>` in a new tab.

**Bottom row — Two side-by-side cards:**
- **Your QR code** — 200×200 QR encoding `https://<origin>/s/<shopId>`, plus a "Download PNG" button (render offscreen canvas, `toDataURL`, trigger download) and "Open kiosk view" link.
- **Bank status** — verified / not verified / not added, with a subtle amber banner if not verified: "Add bank details to receive payouts" → link to `/vendor/bank`.

---

## `/vendor/analytics` — Analytics page

Client component (needs interactive period toggle).

**Header row**: title "Analytics" + a segmented control on the right:
- `Day` (last 30 days) · `Week` (last 12 weeks) · `Month` (last 12 months)
- Selecting one refetches `GET /api/vendor/analytics?period=<x>`.

**Summary row — 6 tiles:**
- Total prints
- Total revenue
- Colour prints
- B&W prints
- Colour revenue
- B&W revenue

**Main chart** — one card, full width:
- Simple bar chart (no chart library — hand-roll SVG) plotting `series[].prints` per bucket.
- Stacked bars: colour prints on top (indigo), B&W beneath (zinc-400).
- Y-axis: prints. X-axis: bucket labels (format `YYYY-MM-DD` → "Sep 12", `YYYY-Www` → "W37", `YYYY-MM` → "Sep '26").
- Hover a bar → tooltip with breakdown.
- Cap the chart at ~240px tall so it fits without scroll.

**Revenue chart** — second card underneath:
- Same bars but plotting `revenue_paise` per bucket. Single-color bars in emerald.
- Toggle between "Revenue" and "Prints" if you'd rather do a single chart with a tab — either is fine.

**Recent jobs table** — same as Overview but showing the analytics.recent list.

Loading state: shimmer skeleton tiles + chart.
Empty state: friendly copy "No paid prints in this window yet."

---

## `/vendor/shop` — Shop info

Editable form.

Fields:
- Shop name (from `shop.name`, required)
- Public location description (from `shop.location`, e.g. "Campus Gate, IIT Bombay")
- Contact email (from `shop.contact_email`, optional, pre-fills from Google if empty)
- Contact phone (from `shop.contact_phone`)

Save button calls `PUT /api/vendor/shop`. Toast on success.

Below the form, a "Danger zone" section — greyed out for now with copy "Contact PrintBuddy support to suspend or delete your shop."

---

## `/vendor/location` — Printer location

The map/coords page.

**Layout**: 2-column split on desktop (400px sidebar form on the left, coord readout on the right), stacked on mobile.

**Left column — form:**
- Big "**Use my current location**" button (bg-indigo-600, `Locate` icon). Calls `navigator.geolocation.getCurrentPosition`. On success, populates the lat/lng inputs. On failure, shows the browser's rejection message inline.
- Two number inputs side-by-side: **Latitude** (`step="0.000001"`, range -90 to 90), **Longitude** (`step="0.000001"`, range -180 to 180). Pre-filled from `shop.latitude / longitude` if set.
- Textbox: **Google Place ID** (optional; small helper "Advanced — leave blank if unsure").
- **Save location** button → `PUT /api/vendor/shop { latitude, longitude, google_place_id }`.

**Right column — readout / preview:**
- Card showing the current saved coords: "Printer is at **19.076090, 72.877426**" (or "Not set yet" in muted grey).
- Big "**View on Google Maps**" button — link to `https://www.google.com/maps?q=<lat>,<lng>` with `target="_blank"`.
- Below it, a preview using a static map placeholder: a light grey card with a centered `MapPin` icon and "Location preview appears here after saving." (No embedded map — we're doing coords-only per product decision. Optional stretch: embed an OpenStreetMap iframe `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=<lng-0.005>,<lat-0.005>,<lng+0.005>,<lat+0.005>&marker=<lat>,<lng>" />` — no key required.)

Show a soft warning banner at the top: "Customers need accurate coordinates to find your shop and see distance in the app."

---

## `/vendor/bank` — Bank details

- Form with the fields from onboarding: `account_holder_name`, `account_number`, `ifsc_code`, `bank_name`, `branch`, `upi_id`.
- IFSC input auto-uppercases as user types. Live validation shows a small green check when the pattern matches, red hint otherwise.
- Account number rendered like `••••••1234` when saved and untouched — clicking a "Show" toggle reveals full digits (client-side; we already have them from `/api/vendor/me`).
- **Verified badge** at the top: if `bank.verified === true`, emerald "Verified" pill; otherwise amber "Pending verification" pill with copy "Our team will verify your details within 24 hours before enabling payouts."
- Save button calls `PUT /api/vendor/bank`. Any save flips `verified` back to false (already handled server-side) — surface this in a confirmation modal: "Saving new bank details will require re-verification. Continue?".

---

## `/vendor/profile` — Personal profile

Simple form.
- **Google account block** at the top (read-only): avatar + `user.name` + `user.email`, tiny caption "Signed in with Google".
- Editable fields: `full_name`, `phone`, `address`.
- Save → `PUT /api/vendor/me`.
- **Sign out** button at the bottom (red text, no bg) → calls `supabase.auth.signOut()` then routes to `/login`.

---

## `/vendor/claim` — Invite claim page

Client component, extremely simple.

- Reads `?token=<token>` from search params.
- If not signed in, middleware sends them to `/login?next=/vendor/claim?token=...` — after Google sign-in they land back here.
- On mount, POSTs `/api/vendor/claim { token }`.
- While loading: centered spinner + "Claiming your shop…".
- Success: `router.replace("/vendor/onboarding")` so they can fill in profile/bank.
- Errors: friendly card for each shape returned by the API:
  - 404 → "Invite not found or already used."
  - 410 → "This invite has expired. Contact PrintBuddy to get a new one."
  - 409 → the API's error message ("This account already owns another shop").
  - 403 → "This invite was sent to a different email — please sign in with the correct Google account." + "Sign out" button.

---

## Admin extensions — update `/dashboard/page.tsx`

The existing `/dashboard` becomes an internal PrintBuddy admin tool for the ops team (i.e. you, Pranav). Gate it in the page itself:

- Server-fetch `getUser()`. If not `isAdmin(user)` (import from `@/lib/admin`), render a stark "Not authorised" screen with "Signed in as `<email>`. Contact PrintBuddy if this is a mistake." and a sign-out button. Do **not** redirect — a friendly refusal is better UX than a redirect loop.

Add two new sections to the existing dashboard, above whatever's already there:

### 1. Shops list + creator

Card titled "**Shops**":
- Table of all shops from `GET /api/admin/shops`. Columns: name, location, status pill, virtual pill (indigo if `virtual_mode`), owner (Google email if any, otherwise a small amber "Unclaimed" pill), created.
- Below the table, a "**+ New shop**" button opens a modal with inputs: name (required), location, "Virtual mode" checkbox (default on for demos). Submit → `POST /api/admin/shops`, then refresh the list.

### 2. Invites card

Titled "**Vendor invites**":
- Table of `GET /api/admin/invites` (add a filter dropdown by shop). Columns: shop name (join from shops list in the client), intended email, status (Unclaimed / Claimed / Expired), created, expires.
- Row action for Unclaimed rows: "Copy link" button — copies `https://<origin>/vendor/claim?token=<token>`.
- Below the table, "**+ Generate invite**" — modal picks an unclaimed shop (must have no `owner_id`), optional intended email. Submit → `POST /api/admin/invites`; on success show a big copyable link box with "Copy" + "Send via WhatsApp" (opens `https://wa.me/?text=<url-encoded-message>`) + "Send via email" (opens `mailto:?subject=...&body=...`).

Keep the existing sections (pricing editor, capability editor, queue, simulate controls) below these — they're still useful for debugging a specific shop.

---

## Data contracts (already implemented server-side)

```ts
// GET /api/vendor/me
type VendorMeResponse = {
  onboarded: boolean;        // has vendor_profiles row
  hasShop: boolean;          // owns a shops row
  user:    { id: string; email: string | null; name: string | null; avatar_url: string | null };
  profile: { user_id: string; full_name: string; phone: string; address: string | null;
             created_at: string; updated_at: string } | null;
  shop:    { id: string; name: string; location: string | null;
             latitude: number | null; longitude: number | null; google_place_id: string | null;
             contact_email: string | null; contact_phone: string | null;
             status: string; virtual_mode: boolean } | null;
  bank:    { shop_id: string; account_holder_name: string; account_number: string;
             ifsc_code: string; bank_name: string | null; branch: string | null;
             upi_id: string | null; verified: boolean;
             created_at: string; updated_at: string } | null;
};

// PUT /api/vendor/me      body: { full_name, phone, address? }         → { profile }
// PUT /api/vendor/shop    body: partial shop fields                    → { shop }
// PUT /api/vendor/bank    body: full bank details                      → { bank }
// POST /api/vendor/claim  body: { token }                              → { shopId }

// GET /api/vendor/analytics?period=day|week|month
type AnalyticsResponse = {
  period: "day" | "week" | "month";
  since:  string;
  summary: {
    total_prints: number; total_revenue_paise: number;
    color_prints: number; bw_prints: number;
    color_revenue_paise: number; bw_revenue_paise: number;
    total_jobs: number;
  };
  series: Array<{
    bucket: string;         // YYYY-MM-DD | YYYY-Www | YYYY-MM
    prints: number; revenue_paise: number;
    color_prints: number; bw_prints: number;
  }>;
  recent: Array<{
    id: string; created_at: string; status: string;
    price_paise: number; pages: number; copies: number;
    color: boolean; paper: string; file_name: string;
  }>;
};

// GET /api/admin/shops                                                 → { shops: [...] }
// POST /api/admin/shops   body: { name, location?, virtual_mode? }     → { shop }
// GET /api/admin/invites?shopId=<uuid>                                 → { invites: [...] }
// POST /api/admin/invites body: { shop_id, email? }                    → { invite, claimUrl }
```

---

## Files to create

Under `apps/web/`:

Routes:
- `app/vendor/layout.tsx`
- `app/vendor/page.tsx`
- `app/vendor/analytics/page.tsx`
- `app/vendor/shop/page.tsx`
- `app/vendor/location/page.tsx`
- `app/vendor/bank/page.tsx`
- `app/vendor/profile/page.tsx`
- `app/vendor/onboarding/page.tsx`
- `app/vendor/claim/page.tsx`

Shared components (under `components/vendor/`):
- `VendorSidebar.tsx`
- `VendorTopBar.tsx`
- `StatTile.tsx` (reusable big-number card)
- `SimpleBarChart.tsx` (SVG stacked or single-series bar chart, no deps)
- `Modal.tsx` (if not already present)
- `SegmentedControl.tsx` (Day/Week/Month toggle)

Extend `app/dashboard/page.tsx` in place.

Package installs allowed: none required. If you want, you may add `date-fns` for date formatting; not required — the existing `lib/date-utils.ts` is fine.

---

## Notes / gotchas

- `@supabase/ssr` cookies must be handled the same way as the existing customer app — reuse `createClient` from `@/lib/supabase/server` and `@/lib/supabase/client`.
- Do not fetch `vendor_bank_details` or `vendor_profiles` directly from the browser Supabase client. Always go through `/api/vendor/me` — RLS is set up to allow direct reads but the API bundles them in a single round trip.
- Every mutating call needs error handling — surface `error.message` from the JSON body in a small inline alert.
- The customer-facing print flow does **not** need to know about vendors — leave `/app/*`, `/kiosk/*`, `/s/*`, `/login`, and all `/api/*` (other than the new vendor + admin routes) unchanged.
- Every interactive element gets `aria-label` or accessible text and a visible focus ring.
- Sign-out helper: `import { createClient } from "@/lib/supabase/client"; await createClient().auth.signOut(); router.push("/login");`
