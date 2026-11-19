# HIMMER Launch Video — Asset Manifest

All screenshots captured from **https://himmer.vercel.app** (production deployment).

---

## 01-marketing — Desktop marketing site (1440px)

| File | What it shows | Use for |
|------|--------------|---------|
| `01-homepage-hero.jpg` | "From your phone. To the page. Just like that." hero + phone+printer image | Opening title card |
| `02-how-it-works.jpg` | "A few taps. A fresh stack of pages." — 4-step flow: Scan QR → Make it yours → Pay with clarity → Pick up your print | How-it-works sequence |
| `03-vendor-pitch.jpg` | "Every order. In one place." workflow + "Your equipment. A better way to take orders." | Shop owner pitch segment |
| `04-faq-section.jpg` | "A little clarity before you print." FAQ section | Trust / objection handling |
| `05-footer.jpg` | Dark emerald footer with HIMMER watermark, full site links | End card backdrop |
| `06-steps-and-vendor.jpg` | Transition combining 4-step icons + vendor section | Transition frame |
| `07-pricing-privacy.jpg` | "Know the price. Then press print." + "Your documents deserve discretion." | Value prop / privacy messaging |

---

## 02-student-flow — Customer PWA (phone UX)

Shoot order follows the real user journey:

| File | What it shows | Use for |
|------|--------------|---------|
| `01-app-home.jpg` | App home — "Scan. Pay. Print." green hero card + Find a printer / Doorstep delivery | Customer journey start |
| `02-nearby-printers.jpg` | "Nearby Printers" with Map/List toggle + search bar | Shop discovery |
| `03-qr-scan-camera.jpg` | Camera permission screen — dark overlay, green camera icon, "Only used for QR scanning" privacy note | QR scan moment |
| `04-print-options-clean.jpg` | Print options card — Scan QR prompt, copies, pages, B&W vs Colour, orientation | Settings screen |
| `05-print-options-full.jpg` | Scrolled-down print options — Double-sided, A4/A3/Letter, pages-per-sheet, quality | Full options reveal |
| `06-job-history.jpg` | Job history — 60 real print jobs, Printing/Printed badges, ₹3–6 prices from JDIET | Social proof / real usage |
| `07-profile.jpg` | Profile — 40 prints, HIMMER Shop favorite, Google sign-in ⚠️ **blur email + phone before publish** | Account screen |
| `08-job-tracking-live.jpg` | **LIVE JOB — "Printing now..."** — real-time status, 1×3 copies, Black & white, A4, ₹6.00 | Climax moment of the flow |

---

## 03-vendor-dashboard — Shop partner portal (desktop)

| File | What it shows | Use for |
|------|--------------|---------|
| `01-overview.jpg` | HIMMER PARTNER portal — Prints today, Revenue today, Colour vs B&W, Live jobs, Print queue | Shop dashboard overview |
| `02-analytics.jpg` | Analytics — 8 revenue/print KPIs, Prints-over-time chart, Today/Week/Month filters | Business analytics |
| `03-shop-profile.jpg` | Shop info form — name, location, GPS pin config, contact details | Onboarding |
| `04-printer-setup.jpg` | Printer setup — B&W/colour printer select, Test vs Real mode toggle, "Download / connect app" | Printer connection |
| `05-wallet-payouts.jpg` | Wallet — Lifetime revenue, withdrawal balance, **"Payout details verified" green badge**, Request funds | Revenue payout |
| `06-agent-download.jpg` | "HIMMER for Windows" — Download Windows 10/11 or Windows 7 build, one-paste setup | Shop onboarding / agent install |

---

## 04-brand-kit — Logo & identity

| File | Notes |
|------|-------|
| `logo-horizontal-dark.svg` | Primary logo — dark backgrounds |
| `logo-horizontal-light.svg` | Primary logo — light backgrounds |
| `logo-horizontal-white.svg` | Logo — solid white (overlays) |
| `logo-stacked-dark/light.svg` | Stacked lockup for square placements |
| `wordmark-dark/light.svg` | Text-only wordmark |
| `symbol-green-1024.png` | Symbol on green — social/thumbnail |
| `symbol-dark/light/transparent.png` | Symbol variants |
| `favicon-512.png` | 512px favicon (use as app icon in video) |
| `brand-tokens.css` | Emerald #00CE68, Forest #052E1B, Manrope font |
| `brand-preview.html` | Interactive brand reference preview |

---

## 05-kiosk — Shop-side kiosk display

| File | What it shows | Use for |
|------|--------------|---------|
| `02-kiosk-qr-ready.jpg` | **REAL live kiosk** — "kaka" shop, Yavatmal, scannable QR code, "PRINTER READY" in green | THE key shot: kiosk at shop |
| `01-kiosk-queue-state.jpg` | Kiosk with queued job — "Printer needs shop attention", payment success toast, "Pranav coming up next" | Error resilience / queuing |
| `03-agent-connect.jpg` | Agent connect link page | Setup flow |

---

## Suggested video sequence

```
HOOK (0–3s)       → 05-kiosk/02-kiosk-qr-ready.jpg  (the QR at the shop)
PROBLEM (3–8s)    → Narration: "Printing at a shop means WhatsApp, chat, waiting..."
SOLUTION (8–12s)  → 01-marketing/01-homepage-hero.jpg
FLOW (12–35s)     → Student journey: app-home → qr-scan → print-options → job-tracking-live
SHOP SIDE (35–45s)→ Vendor: overview → analytics → kiosk-qr-ready
TRUST (45–50s)    → job-history (60 prints), wallet (payout verified)
CTA (50–60s)      → Footer + logo + "himmer.vercel.app"
```

---

## ⚠️ Before publishing video

- **Blur or replace** the email and phone number on `07-profile.jpg`
- The job history shows real UUIDs as filenames — these are fine (no personal docs visible)
- The "purvesh kaka" shop name and "Pranav Shinde" account belong to real test users — confirm they're OK to show
