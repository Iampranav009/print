# PrintBuddy — Project Design Document

**Version:** 0.1 (Foundational)
**Status:** Pre-build / architecture locked, MVP scoping
**One-line description:** A software platform that turns existing local printing/Xerox shops into automated, connected, self-serve print centers — without forcing them to buy new hardware.

---

## 1. Problem

Printing at a local shop today is a fully manual, operator-bound process:

> Customer → WhatsApp / pen-drive / email the file → Shopkeeper downloads it → opens it → sets pages, copies, color → prints → mentally calculates price → collects cash.

Every order needs the shopkeeper's hands and attention. This is slow, error-prone, creates queues, causes constant price disputes ("you charged me for 12 pages, it was 10"), and doesn't scale beyond one person's speed. It also traps the shop in cash and offers zero digital record.

## 2. Solution

PrintBuddy replaces the manual loop with a self-serve digital one. The customer does the configuration and payment from their own phone; the print happens automatically.

```
Customer scans QR (sticker on the wall / on the monitor)
        ↓
Web app opens on the customer's phone (PWA — no app-store install needed)
        ↓
Upload PDF / photo / doc  →  choose copies, page range, color/B&W,
                              orientation, paper size, single/double-sided
        ↓
Live price shown  →  Pay with Razorpay (UPI-first)
        ↓
Razorpay server-to-server webhook confirms payment
        ↓
Cloud backend dispatches a print-ready job to that shop's Print Agent
        ↓
Print Agent (on shop PC or Raspberry Pi) prints via the OS print layer
        ↓
Status reported back → customer's phone + optional shop monitor show "Success"
```

The optional shop monitor also runs **advertisements** when idle — a secondary revenue stream, strongest in high-footfall spots like colleges and hostels.

## 3. Key innovation & positioning

We are **not** manufacturing a kiosk. The moat is the **software network and the customer habit**, not hardware.

- We turn shops that already have a printer, a PC, and internet into **connected print nodes**.
- The defensibility comes from shop density + repeat customers, which a hardware company can't easily copy.
- This keeps our cost-to-add-a-shop near zero, which is what lets the network spread fast.

## 4. Hardware tiers (how "no hardware cost" actually works)

"Zero hardware" and "put a Raspberry Pi + monitor in every shop" are in tension — a Pi + screen is ~₹4,000–6,000 per shop. We resolve this by **tiering**, and leading with the zero-hardware tier so we can sign shops fast.

| Tier | Shop already has | We add | Best for |
|------|------------------|--------|----------|
| **Tier 0 — Zero hardware** | PC + printer + internet | Just the Print Agent software + a printed QR sticker | Fastest rollout; most existing shops |
| **Tier 1 — Headless node** | Printer + internet, no PC | A Raspberry Pi running the Agent | Shops without a usable PC |
| **Tier 2 — Ad node** | Printer + footfall | Pi + a monitor (QR, payment status, idle ads) | Colleges, hostels, high-traffic spots |

**Principle: the monitor and the Pi are optional add-ons, not the core.** The core is the software. This keeps the whole thing lean and lets onboarding be "install an app + stick a QR on the wall."

## 5. System architecture

### 5.1 Components

1. **Customer app** — Next.js PWA. Upload, configure, pay, track, release/pickup.
2. **Shop dashboard** — Next.js web app. Pricing config, live queue, printer status, revenue, history.
3. **Central/admin platform** — Next.js web app. Shop onboarding, commission/revenue, analytics, remote monitoring of agents.
4. **Cloud backend** — Next.js Route Handlers (Node/TypeScript) + Supabase. APIs, Razorpay webhooks, job orchestration, PDF normalization.
5. **Print Agent** — a small standalone service (Python) on the shop PC / Raspberry Pi. Receives jobs, prints via the OS print layer, reports status.
6. **Supabase** — Postgres (data), Auth, Storage (temporary document files), Realtime (push jobs to agents).
7. **Razorpay** — payments (Orders API + Checkout + webhooks).

### 5.2 Data flow (text diagram)

```
[Customer Phone / PWA]
   | upload + config + pay
   v
[Cloud Backend  ── Next.js Route Handlers]
   |  \                                   ^
   |   \-- normalize file to print-ready  |  status updates
   |       PDF, compute exact page count  |  (Realtime)
   v                                      |
[Supabase: Postgres + Storage + Realtime] |
   ^                                      |
   |  Razorpay webhook -> mark paid        |
[Razorpay]                                |
   |                                      |
   |  (paid) job pushed via Realtime      |
   v                                      |
[Print Agent on Shop PC / Raspberry Pi] --+
   | lp / spooler
   v
[Existing Printer]
```

### 5.3 Why the agent connects *outbound* (important)

Shops sit behind ordinary routers (NAT). We can't reliably push jobs *into* a shop network from outside. So the **Print Agent opens a persistent outbound connection** to the cloud (Supabase Realtime subscription or a WebSocket) and subscribes to its own shop's job channel. No port-forwarding, no static IP, no firewall config at the shop. Polling every few seconds is the fallback if the socket drops.

### 5.4 Offline resilience

Indian shop internet is flaky. The Agent must:
- Queue any **already-paid** job locally and flush it when connectivity returns, so a paying customer never loses a job.
- Cache the shop's current price config so it can still validate jobs briefly offline.
- Report "printer offline / out of paper / jam" states back so the backend can auto-refund or hold.

## 6. The printer problem — how we support (almost) any printer

**We do NOT integrate with each printer's proprietary SDK or app (no HP app, no Canon SDK, etc.).** We print through the **operating system's print abstraction**, which already handles the printer-specific part via its installed driver.

### 6.1 Linux / Raspberry Pi → CUPS (recommended reference platform)

CUPS (Common Unix Printing System) is the universal print layer on Linux/macOS. One standardized command set drives nearly any printer:

- Copies → `-n 3`
- Page range → `-P 2-5,8`
- Grayscale → `-o ColorModel=Gray` (color is default)
- Duplex → `-o sides=two-sided-long-edge`
- Paper size → `-o media=A4`
- Example: `lp -d ShopPrinter -n 2 -o media=A4 -o sides=two-sided-long-edge -o ColorModel=Gray -P 1-10 job.pdf`

Driver coverage: **Gutenprint** (huge range), **HPLIP** (all HP), plus Brother/Canon/Epson packages. This combination covers the overwhelming majority of printers sold in India.

**Recommendation:** standardize the controlled tier (Pi) on **Raspberry Pi OS + CUPS**. Because we control that OS image, print behavior is uniform and predictable across every shop we deploy a Pi to. This is the single biggest reliability win available to us.

### 6.2 Windows (shop's own PC, Tier 0) → print spooler + silent PDF printer

For shops using their existing Windows PC, the Agent prints through the Windows spooler using a silent, headless PDF printer:
- **SumatraPDF** (CLI: `SumatraPDF.exe -print-to "PrinterName" -print-settings "..." job.pdf`) — lightweight, reliable, or
- **Ghostscript** for more control.

The manufacturer driver is installed **once** during onboarding; after that, any app (including our Agent) prints to it through the spooler. The HP app is a consumer convenience, not a requirement.

### 6.3 Everything becomes a PDF first (server-side normalization)

The Agent should always receive a **print-ready PDF**. The backend converts on upload:
- Office docs (`.docx`, `.pptx`, `.xlsx`) → PDF via **LibreOffice headless** (`soffice --headless --convert-to pdf`).
- Images (`.jpg`, `.png`) → PDF via **img2pdf** / ImageMagick, respecting orientation.
- PDFs pass through, but we still inspect them.

Normalizing server-side gives us three things at once: a reliable preview, an **exact page count**, and **color detection per page** — which we use directly for pricing and dispute prevention (below).

### 6.4 Print libraries / packages summary

| Purpose | Linux / Pi | Windows |
|---------|-----------|---------|
| Print layer | CUPS (`pycups` from Python) | Print spooler (via SumatraPDF/Ghostscript CLI) |
| Silent PDF print | `lp` | SumatraPDF / Ghostscript |
| Office → PDF | LibreOffice headless | LibreOffice headless |
| Image → PDF | img2pdf / ImageMagick | img2pdf / ImageMagick |
| PDF inspect (pages, color) | pdfplumber / PyMuPDF (`fitz`) | same |
| Drivers | Gutenprint + HPLIP + vendor pkgs | Manufacturer driver |

## 7. Print Agent design

- **Language:** Python (mature CUPS bindings via `pycups`, runs perfectly on Pi; on Windows shells out to SumatraPDF). One clean codebase for both.
- **Packaging:** `systemd` service on Pi/Linux; a Windows Service (or auto-start tray app) on Windows.
- **Registration:** each Agent is bound to a `shop_id` + a unique `agent_token` at install.
- **Loop:**
  1. Open outbound connection, subscribe to this shop's job channel.
  2. On new **paid** job: download the print-ready PDF via a short-lived signed URL.
  3. Map job options → CUPS/spooler flags. Submit to the correct printer.
  4. Poll the OS spooler for job completion. Report `printing → printed / failed(reason)`.
  5. Delete the local file immediately after printing (privacy).
- **Health beacon:** heartbeat every N seconds so the central platform shows each shop as online/offline and each printer as ready / no-paper / jam.

## 8. Payment flow (Razorpay)

**Golden rule: never dispatch a print job on a client-side "payment success" callback — those can be spoofed. Only the server-to-server webhook triggers printing.**

Sequence:
1. Customer finalizes config → backend creates a **Razorpay Order** (`order_id`) tied to the `print_job_id`. (Orders API is required for clean reconciliation and future revenue-splitting.)
2. Razorpay Checkout opens on the phone, **UPI-first** (default flow for India; card/wallet as fallback). Repeat customers see their last-used UPI app pre-selected — critical when transactions are ₹3–₹150 and friction kills conversion.
3. Customer pays.
4. Razorpay sends a **webhook** to the backend. Backend verifies the signature, marks the job `paid`.
5. Only now the job is pushed to the Agent.
6. **Refund path exists from day one:** printer jam / out of paper / failed print → one-tap (or automatic) refund via Razorpay. Every un-handled failure otherwise becomes a WhatsApp fight.

## 9. Pricing integrity & dispute prevention

Pricing integrity is central to the whole promise — if the price is fuzzy, we're no better than the manual shop.

- **The price the customer sees is the price they pay.** Kill any "final cost may vary" style copy. If price differs per shop, resolve the shop first (via the QR / Scan step), show that shop's exact price, then **lock** it before payment.
- **Server computes the real page count and color usage** from the normalized PDF — not the customer's claim. A "color" job that is actually all black pages can be priced/handled correctly, and vice-versa, removing the classic color-vs-B&W dispute.
- Price = f(pages actually printed, copies, color pages vs B&W pages, paper size, single/double-sided) using the **shop's configured rates**.

## 10. Config screen — required fields

Current build has: copies, page range (All/Custom), color/B&W, orientation, live estimate. **Add before launch:**
- **Paper size** (A4 / A3 / Legal) — a real price lever; disputes if missing.
- **Single vs double-sided** — another real price lever.
- **Custom page-range validator** that parses `2,5-8,11` and shows the **resulting page count** so the estimate stays honest.
- Replace "final cost may vary based on kiosk model" with a locked, shop-specific price after the shop is resolved.

## 11. Unattended pickup / print-release (biggest design gap to close)

If jobs print automatically with nobody watching, a stranger can walk off with someone's ID proof or exam paper. This is both a privacy risk and a genuine selling point once solved.

**Mechanism:** the job does not release to the tray until the customer either taps **"I'm at the printer"** in the app, or enters/ shows a **4-digit release code** displayed on their phone. The Agent holds the paid job until release is confirmed.

## 12. Data model (core tables, Supabase/Postgres)

- `shops` — id, name, location, owner contact, status, commission_rate, onboarding_state.
- `agents` — id, shop_id, agent_token, platform, last_heartbeat, status.
- `printers` — id, shop_id, cups_name/win_name, capabilities (color, duplex, sizes), status.
- `pricing` — shop_id, per-page B&W, per-page color, A3 multiplier, duplex rule, min charge.
- `print_jobs` — id, shop_id, customer_ref, file_ref, pages, color_pages, copies, options JSON, computed_price, status, razorpay_order_id, release_code, created_at.
- `payments` — id, print_job_id, razorpay_order_id, razorpay_payment_id, status, amount, refund_status.
- `customers` — id, phone, last_upi_app, saved history (opt-in).
- `ad_slots` / `ad_plays` — (Tier 2) monitor ad inventory + play logs.

**Job status state machine:**
`created → priced → awaiting_payment → paid → dispatched → printing → printed`
with branches: `payment_failed`, `print_failed(reason) → refunded`, `awaiting_release → released`.

## 13. Security & privacy

- Documents are sensitive (IDs, exam papers, legal docs). Store in Supabase Storage with **short-lived signed URLs**; **auto-delete after successful print** (or a short retention window). Never keep files longer than needed.
- Print-release code / "I'm at the printer" prevents strangers grabbing output.
- Agent authenticates with a per-shop token; jobs are scoped to the shop.
- Razorpay webhook **signature verification** mandatory; no printing on client callbacks.
- No document content leaves the pipeline for ads/analytics — only metadata (pages, price, timing).

## 14. Tech stack (decided)

| Layer | Choice | Why |
|-------|--------|-----|
| Customer app | **Next.js (App Router) + Tailwind + shadcn/ui**, built as a **PWA** | QR should open a web app instantly, no Play Store gate. APK wrapper later if needed. |
| Shop + Central dashboards | Next.js + shadcn/ui | Same stack, shared components. |
| Backend | **Next.js Route Handlers (Node/TypeScript)** | One language across the whole product; fast iteration for a small team; handles APIs + Razorpay webhooks. |
| DB / Auth / Storage / Realtime | **Supabase (Postgres)** | Batteries-included; **self-hostable via Docker** (matches "we host it ourselves"); Realtime elegantly pushes jobs to Agents with no separate broker. |
| Payments | **Razorpay** (Orders API + Checkout + Webhooks, UPI-first) | India-native, UPI intent, reconciliation-ready. |
| Print Agent | **Python** standalone service (`pycups` on Linux/Pi; SumatraPDF/Ghostscript on Windows) | Mature printing ecosystem; runs great on Pi. |
| File conversion | LibreOffice headless, img2pdf, PyMuPDF | Normalize everything to print-ready PDF; exact page/color analysis. |
| Reference hardware (controlled tier) | Raspberry Pi + Raspberry Pi OS + CUPS | Uniform, predictable driver stack across shops. |
| Hosting | Self-hosted (your own VPS/server) | Your stated preference; Supabase + Next.js + agents all self-hostable. |

**Backend decision, explained:** for a lean MVP with a small team, fewer moving parts wins. Next.js Route Handlers + Supabase covers the customer, shop, and central APIs, the Razorpay webhook, and (via Supabase Realtime) agent job push — without standing up a separate service or message broker. **Migration path:** when backend logic outgrows route handlers (revenue-splitting engine, heavy analytics, fleet monitoring), extract a dedicated **NestJS** service and/or a real queue (BullMQ/Redis). Supabase's Postgres travels with you either way, so nothing is thrown away.

## 15. Revenue model

1. **Per-print commission** — a small cut of each job. Low per unit, but scales with network + the fact that real orders are bulk assignments (₹50–₹150), not single ₹3 pages. **Design and price for the bulk-assignment user.**
2. **Ad revenue (Tier 2, realistic view)** — the idle monitor is real value, but programmatic digital-ad sales is a whole separate business. Near-term, monetize with **locally-sold ads** (coaching institutes, hostels, cafés) and treat the screen mainly as a "free perk" that makes shopkeepers say yes. **Do not base the financial model on ad revenue yet.**
3. Possible later: subscription tier for shops (priority support, multi-printer, analytics).

## 16. Why the shopkeeper says yes (must-nail pitch)

Without shop density the customer app is useless, so the shopkeeper's incentive is the whole game. What they gain:
- **Throughput without labor** — jobs print themselves; the queue at the counter shrinks.
- **No cash handling / no mental price math** — money lands digitally, reconciled.
- **A bigger pie** — self-serve + digital payment attracts more student volume than a manual counter can serve.
- **Zero upfront cost (Tier 0)** — install an app, stick a QR on the wall.
- Onboarding friction must be **minimal** — this is a product requirement, not a nice-to-have.

## 17. MVP scope

**In (v1):**
- Customer PWA: upload PDF/image → config (copies, range, color, orientation, **paper size**, **duplex**) → live locked price → Razorpay UPI → track.
- Server-side normalize to PDF + exact page/color count.
- One Print Agent build (start with **Pi + CUPS** as the reference; Windows agent close behind).
- Webhook-gated dispatch + basic refund.
- Print-release code.
- Minimal shop dashboard: pricing config + live queue + printer online/offline.
- Manual shop onboarding by us.

**Out (later):**
- Monitor/ad system (Tier 2).
- Multi-printer per shop, print history for customers, saved library.
- Self-serve shop onboarding, commission automation, fleet analytics.
- APK wrapper.

## 18. Key risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Print Agent reliability on cheap printers (job "sent" ≠ "printed") | Poll spooler for true completion; prototype early on the worst printer you can find; report real states; auto-refund on failure. |
| Shop internet drops mid-job | Local queue on Agent; flush on reconnect; never lose a paid job. |
| Payment spoofing | Webhook-only dispatch + signature verification. |
| Price disputes | Server-computed pages/color; locked price; kill "may vary" copy. |
| Privacy of sensitive docs | Auto-delete after print; signed URLs; release code. |
| Shopkeeper won't adopt | Zero-cost Tier 0, minimal onboarding, clear labor/throughput pitch. |
| Ad revenue overestimated | Treat as upside, not core; sell local ads manually first. |

## 19. Build roadmap (phased)

1. **Phase 0 — Spike the risky part first.** Build a bare Print Agent on a Pi + CUPS. Prove: receive a PDF from the cloud → print it → confirm true completion → report back. Test on the ugliest printer available.
2. **Phase 1 — Payment-gated single-shop loop.** Customer PWA → config → Razorpay UPI → webhook → dispatch → print → release code. One real shop.
3. **Phase 2 — Shop dashboard + pricing config + refunds + offline queue.**
4. **Phase 3 — Central platform:** onboarding, agent fleet monitoring, commission.
5. **Phase 4 — Windows agent, multi-printer, customer history.**
6. **Phase 5 — Tier 2 monitor + local ads.**

## 20. Open questions to decide next

- Exact commission model and default per-page rates for the pilot shop.
- Whether v1 requires customer login or stays phone-number-light (lower friction) for the first order.
- Which single pilot shop / campus to launch on.
- Refund policy wording (auto vs one-tap; time window).
- Data retention window for printed documents (immediate delete vs a few minutes for reprints).

---

*This document reflects the locked architecture direction: software-first, OS-print-layer integration (CUPS/spooler) so any driver-supported printer works, webhook-gated Razorpay payments, Supabase + Next.js self-hosted, and a tiered rollout that leads with zero-hardware shops.*