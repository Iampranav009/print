# PrintBuddy — AI Agent Guidelines & Project Instructions (`AGENTS.md`)

## 1. Project Overview & Mission

**PrintBuddy** is an automated, self-serve print platform that transforms existing local printing/Xerox shops into connected print nodes without requiring expensive proprietary hardware.

### Core Philosophy & Positioning
- **Software-First, Not a Kiosk:** Defensibility and moat come from shop density, repeat student/customer habits, and software network effects—not manufactured hardware kiosks.
- **Hardware Tiers:**
  - **Tier 0 (Core / Zero-Hardware Rollout):** Shop's existing PC + Printer + Internet. Deploys the Print Agent software + a QR sticker. Fast, zero-friction onboarding.
  - **Tier 1 (Headless Node):** Dedicated Raspberry Pi running the Print Agent (for shops lacking a usable PC).
  - **Tier 2 (Ad Node - Optional Add-on):** Raspberry Pi + Monitor displaying QR, live print status, and local idle ads (coaching centers, cafes). *Not the core MVP.*
- **Zero-Friction Customer Experience:** Customer scans QR code on phone $\rightarrow$ Opens lightweight Next.js PWA (no app store install) $\rightarrow$ Uploads document $\rightarrow$ Configures print options $\rightarrow$ Sees locked live price $\rightarrow$ Pays via UPI (Razorpay) $\rightarrow$ Releases job at printer via 4-digit code $\rightarrow$ Output prints automatically.

---

## 2. Tech Stack & Technologies

| Layer | Technology | Key Details |
|---|---|---|
| **Customer App** | Next.js (App Router), React, TypeScript | PWA (Progressive Web App), Tailwind CSS, shadcn/ui, mobile-first |
| **Shop Dashboard** | Next.js (App Router), TypeScript | Tailwind CSS, shadcn/ui, live queue, pricing config, printer monitor |
| **Central Admin** | Next.js (App Router), TypeScript | Fleet management, shop onboarding, revenue/commission analytics |
| **Cloud Backend** | Next.js Route Handlers (Node/TypeScript) | APIs, Razorpay webhooks, job orchestration, document normalization |
| **Database & Auth** | Supabase (PostgreSQL) | Self-hostable via Docker, Row Level Security (RLS), Supabase Auth |
| **Storage** | Supabase Storage | Encrypted, temporary document storage with short-lived signed URLs |
| **Realtime** | Supabase Realtime | Outbound push to Print Agents via WebSocket / subscriptions |
| **Payments** | Razorpay | Orders API, UPI-first intent flow, server-to-server signed webhooks |
| **Print Agent** | Python (3.10+) | Standalone service: `pycups` on Linux/Pi; SumatraPDF CLI on Windows |
| **File Normalization** | LibreOffice Headless, img2pdf, PyMuPDF | Converts `.docx`, `.pptx`, images to print-ready PDF; inspects pages & color |

---

## 3. Architecture & System Flow

```
[Customer Phone / PWA]
   │ (1) Upload file + select print options
   ▼
[Cloud Backend (Next.js Route Handlers + Supabase)]
   │ (2) Server-side PDF normalization + exact page/color count
   │ (3) Lock price & create Razorpay Order
   ▼
[Razorpay Payment (UPI-First)]
   │ (4) Customer completes payment
   │ (5) Razorpay server-to-server webhook callback (signature verified)
   ▼
[Cloud Backend]
   │ (6) Mark job as 'paid' & assign 4-digit release code
   │ (7) Dispatch job metadata & signed URL via Supabase Realtime
   ▼
[Print Agent (Shop PC / Raspberry Pi)]
   │ (8) Outbound persistent socket; receives paid job
   │ (9) Customer inputs/confirms 4-digit release code
   │ (10) Agent prints via OS spooler (CUPS or Windows Spooler)
   │ (11) Reports status ('printing' -> 'printed' / 'failed')
   │ (12) Deletes local temporary PDF immediately
   ▼
[Printer Output]
```

---

## 4. Critical Engineering Invariants & Security Rules

Agents developing or modifying code in this repository **must strictly observe** the following invariants:

1. **Webhook-Only Dispatch (Zero Client-Side Trust):**
   - **NEVER** trigger or dispatch a print job based on a client-side payment success callback. Client callbacks can be intercepted or forged.
   - Jobs are **ONLY** dispatched after a Razorpay server-to-server webhook is received and its cryptographic signature (`X-Razorpay-Signature`) is verified.

2. **Outbound-Only Print Agent Communication:**
   - Shop networks sit behind ordinary NAT routers with dynamic IPs and strict firewalls.
   - **NEVER** build inbound HTTP servers or expect port-forwarding on shop networks.
   - Print Agents **must** establish persistent outbound connections to the cloud (via Supabase Realtime WebSocket), with an HTTP polling fallback mechanism.

3. **Universal OS-Level Print Abstraction (No Vendor SDKs):**
   - Do **NOT** integrate vendor-specific proprietary SDKs (e.g., HP Smart, Canon SDK, Epson API).
   - Use standard OS print layers:
     - **Linux / Raspberry Pi:** CUPS via `pycups` (e.g., `lp -d <printer> -n <copies> -o ColorModel=Gray -o sides=two-sided-long-edge -P <range> <file.pdf>`).
     - **Windows (Tier 0):** Windows Print Spooler using SumatraPDF CLI (`SumatraPDF.exe -print-to "<PrinterName>" -print-settings "<settings>" <file.pdf>`) or Ghostscript.

4. **Server-Side Document Normalization:**
   - The Print Agent must only receive **print-ready PDFs**.
   - Server converts `.docx`, `.xlsx`, `.pptx` via LibreOffice headless, and images via `img2pdf`.
   - Inspect PDF using `PyMuPDF` (`fitz`) or `pdfplumber` to extract exact physical page count and per-page color detection.

5. **Locked & Deterministic Pricing (Dispute Prevention):**
   - Eliminate "final cost may vary" notices.
   - Once the shop QR is resolved and the PDF is normalized, compute exact pricing:
     $$\text{Price} = f(\text{pages}, \text{copies}, \text{color vs B&W}, \text{paper size}, \text{simplex/duplex}, \text{shop rates})$$
   - Lock price before rendering the Razorpay checkout.

6. **Privacy & Document Ephemerality:**
   - Uploaded documents are private (passports, exam papers, tax forms).
   - Store in Supabase Storage with short-lived signed URLs.
   - Automatically purge files immediately upon print completion (or within a strict short retention window).
   - Agent deletes local cached print files immediately after dispatching to the OS spooler.

7. **Unattended Pickup / Release Code:**
   - To prevent strangers from grabbing documents from the output tray, jobs must require either:
     - A customer tap on "I'm at the printer" in the PWA.
     - A 4-digit release code shown on the customer's phone and verified before the physical job releases to the paper tray.

8. **Offline Resilience & Refund Path:**
   - Print Agent must maintain a local SQLite/file queue for already-paid jobs in case shop internet drops mid-operation.
   - If a printer experiences unresolvable failure (out of paper, hardware jam, error), the backend must support automated or 1-tap customer refunds through Razorpay.

---

## 5. Core Data Model & Status State Machine

### Tables (PostgreSQL / Supabase)
- **`shops`**: `id`, `name`, `slug`, `location`, `owner_phone`, `commission_rate`, `status` (`active`, `paused`), `created_at`
- **`printers`**: `id`, `shop_id`, `os_printer_name`, `is_default`, `capabilities` (JSON: color, duplex, paper sizes), `status` (`online`, `offline`, `paper_jam`, `out_of_paper`)
- **`pricing`**: `id`, `shop_id`, `bw_per_page`, `color_per_page`, `a3_multiplier`, `duplex_discount`, `min_order_amount`
- **`print_jobs`**: `id`, `shop_id`, `printer_id`, `customer_phone`, `file_url`, `file_name`, `page_count`, `color_page_count`, `options` (JSON: copies, range, duplex, paper_size, orientation), `computed_price`, `status`, `release_code`, `razorpay_order_id`, `created_at`
- **`payments`**: `id`, `print_job_id`, `razorpay_order_id`, `razorpay_payment_id`, `amount`, `status` (`pending`, `captured`, `failed`, `refunded`), `webhook_payload`
- **`agents`**: `id`, `shop_id`, `agent_token_hash`, `platform` (`linux_pi`, `windows`), `version`, `last_heartbeat_at`, `status`

### Job State Machine
```
created ──▶ priced ──▶ awaiting_payment ──▶ paid ──▶ awaiting_release ──▶ dispatched ──▶ printing ──▶ printed
   │            │              │
   ▼            ▼              ▼
cancelled    expired     payment_failed
                                            (On printer jam/error)
                                                     │
                                                     ▼
                                            print_failed ──▶ refunded
```

---

## 6. MVP Scope Boundaries (Discipline)

### Included in MVP (v1)
- Customer PWA (scan QR $\rightarrow$ file upload $\rightarrow$ options config $\rightarrow$ locked price $\rightarrow$ Razorpay UPI checkout $\rightarrow$ job tracking $\rightarrow$ 4-digit release code).
- Server-side normalization to print-ready PDF + page & color analysis.
- Print Agent for Raspberry Pi (CUPS) and Windows (SumatraPDF).
- Webhook-gated dispatch + Supabase Realtime subscription.
- Minimal Shop Dashboard (pricing config, live queue, printer heartbeat).
- Basic refund handling on print error.

### Strictly Excluded from MVP (v1)
- Hardware ads / Tier 2 monitor display system.
- Multi-printer automatic load balancing per shop.
- Customer document archive / persistent library.
- Native mobile apps (Android APK / iOS).
- Automated self-serve shop onboarding and self-serve commission splits.

---

## 7. Guidelines for Agent Contributions

When authoring code, refactoring, or generating files in this repository:
1. **TypeScript Strictness:** Keep strict TypeScript checks enabled. Always define explicit interfaces for API payloads and data models.
2. **Modern Web Guidance:** Use Next.js App Router conventions (`app/api/.../route.ts`), React Server Components where appropriate, and keep client bundles lightweight for mobile PWAs.
3. **Agent Python Standards:** The Print Agent must be written in clean, robust Python 3. Include error handling for network drops, spooler polling, and file system cleanup.
4. **No Premature Complexity:** Favor clean Next.js Route Handlers and Supabase capabilities over separate microservices or redundant message queues until scale demands it.
