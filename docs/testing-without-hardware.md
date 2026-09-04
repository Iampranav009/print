# Testing end-to-end without hardware

This guide walks through validating the complete PrintBuddy chain — upload → price → pay → webhook → dispatch → release → print — using Razorpay **test mode** and the agent's **simulate mode**. No phone, no physical printer required.

---

## 1. Razorpay test setup

1. Log in to the [Razorpay Test Dashboard](https://dashboard.razorpay.com/app/dashboard) and switch to **Test Mode** (toggle in the left sidebar).
2. Go to **Settings → API Keys**, generate a test keypair, and add them to `apps/web/.env.local`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_secret
```

3. To complete a test UPI payment in the Razorpay checkout UI, enter the **success VPA**:

```
success@razorpay
```

   Alternatively, test card details (if UPI is unavailable in your browser):
   - Card: `4111 1111 1111 1111`
   - Expiry: any future date
   - CVV: any 3 digits
   - OTP (if prompted): `1234`

4. For automated webhook simulation (what `e2e-sim.ts` does), you also need the webhook secret:

```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

---

## 2. Tunnel setup (CRITICAL — read this first)

**Razorpay cannot reach `http://localhost`.** Without a public URL for your local server, the `order.paid` webhook never fires and every job is permanently stuck in `awaiting_payment`. This is the single most common day-one blocker.

### Option A — ngrok

```bash
ngrok http 3000
```

Copy the `https://xxxx.ngrok-free.app` URL it prints.

### Option B — cloudflared

```bash
cloudflared tunnel --url http://localhost:3000
```

Copy the `https://xxxx.trycloudflare.com` URL.

### Register the webhook in Razorpay

1. Razorpay Test Dashboard → **Settings → Webhooks → Add New Webhook**.
2. **Webhook URL**: `https://<your-tunnel-url>/api/webhooks/razorpay`
3. **Secret**: paste what you put in `RAZORPAY_WEBHOOK_SECRET`.
4. **Events**: enable `order.paid` and `payment.captured`.
5. Save.

> **Without this registration, jobs never leave `awaiting_payment`.** The `e2e-sim.ts` script fires the webhook *directly* via HMAC-signed POST, so it works even without the registered webhook — but real Razorpay test payments made through the checkout UI will not advance the job unless the webhook is wired up.

---

## 3. Start the agent in simulate mode

In the `apps/agent/` directory, make sure `.env` contains:

```env
PRINTBUDDY_PRINT_MODE=simulate
AGENT_TOKEN=<token from seed output>
API_BASE=http://localhost:3000
PRINTER_NAME=PrintBuddy-PDF   # any name — ignored in simulate mode
```

Then start the agent:

```bash
cd apps/agent
python agent.py
```

The agent logs `print mode: simulate` on startup. In simulate mode it:
- Logs the `lp` command it *would* run.
- Sleeps a few seconds.
- Reports `printed` (or `print_failed` if `SIMULATE_FAIL` or `debug_fail_reason` is set).

### Optional: virtual mode with cups-pdf

To exercise the real CUPS code path against a software PDF printer:

```bash
PRINTBUDDY_PRINT_MODE=virtual PRINTER_NAME=CUPS-PDF python agent.py
```

Requires `cups-pdf` installed (`sudo apt install printer-driver-cups-pdf` on Ubuntu).

---

## 4. Run the E2E script

Make sure the dev server is running:

```bash
cd apps/web && pnpm dev
```

### Happy path

```bash
pnpm tsx scripts/e2e-sim.ts
```

Expected output — every line green:

```
PrintBuddy E2E Dry Run
  API:     http://localhost:3000
  Mode:    happy

Step 0: Health check
  ✓ PASS  server healthy
Step 1: Prepare fixture PDF
  ✓ PASS  fixture PDF ready  614 bytes
Step 2: Upload via /api/uploads → signed URL → PUT
  ✓ PASS  upload complete  00000000-.../uuid.pdf
Step 3: POST /api/jobs (4-up, double-sided, B&W, pages 1-6)
  ✓ PASS  job created  id=a1b2c3d4 pages=6 price=200p
Step 4: POST /api/jobs/[id]/pay → Razorpay test order
  ✓ PASS  order created  order_XXXXXXXXXXXXXXXX
Step 5: Simulate order.paid webhook → assert dispatched
  ✓ PASS  job dispatched
Step 6: GET /api/agent/jobs/next → assert correct job + valid download URL
  ✓ PASS  agent sees correct job
  ✓ PASS  download URL resolves to PDF
Step 7: Agent: status → awaiting_release
  ✓ PASS  awaiting_release reached
Step 8: POST /api/jobs/[id]/release → released
  ✓ PASS  job released
Step 9: Agent: status → printing → printed
  ✓ PASS  job printed

── Summary ────────────────────────────────────
  ✓  server healthy
  ✓  fixture PDF ready
  ✓  upload complete
  ✓  job created
  ✓  order created
  ✓  job dispatched
  ✓  agent sees correct job
  ✓  download URL resolves to PDF
  ✓  awaiting_release reached
  ✓  job released
  ✓  job printed

  11/11 passed (all green)
```

### Failure + refund path

```bash
pnpm tsx scripts/e2e-sim.ts --mode fail
```

This sets `debug_fail_reason = "paper_jam"` on the job *before* dispatch. If the real agent is running, it reads this flag from `GET /api/agent/jobs/next` and reports `print_failed` automatically. The script also drives agent status manually so the run completes even without the agent running.

Expected final lines:

```
Step 9: Assert refund initiated (status → print_failed or refunded)
  ✓ PASS  status = refunded   Razorpay refund was initiated automatically

  12/12 passed (all green)
```

> **Note on refunds in test mode**: The refund is initiated by calling the Razorpay refunds API against the `payment_id` stored when the webhook fired. If the simulated webhook didn't record a real Razorpay `payment_id` (because it's a synthetic HMAC-signed POST rather than a real test payment), the status ends at `print_failed` rather than `refunded`. This is expected. To see the full refund path: complete a test payment manually through the checkout UI first (with the tunnel wired up), *then* run `--mode fail`.

---

## 5. Dashboard test panel

Open `http://localhost:3000/dashboard`. In test mode (`NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...`) the **Dev: Simulate** panel appears.

- **Happy Path** — walks a synthetic job through all states server-side. Does not use the real Razorpay webhook (calls `simulate_dispatch` directly). Good for quick smoke tests.
- **Failure + Refund** — same flow but ends with `print_failed` and triggers the refund path.
- **Webhook helper** — shown after a simulation run. Displays the Razorpay order ID and instructions for firing the webhook manually from the Razorpay dashboard or via `curl`.

The **Print Queue** table below the panel updates every 3 s, so you can watch jobs move through states live without refreshing.

---

## 6. When the real printer arrives

Only two things change:

1. Install the printer driver and note the exact CUPS queue name:

```bash
lpstat -p   # Linux — lists installed printers and their names
```

   On Windows, find the printer name in **Settings → Printers & scanners**.

2. Update the agent `.env`:

```env
PRINTBUDDY_PRINT_MODE=real
PRINTER_NAME=<exact name from lpstat>
```

Restart the agent. On the next `released` job it will send a real `lp` (Linux) or SumatraPDF (Windows) print command with all options mapped from the job.

Capabilities auto-populate from the real device on agent startup — every option built in Prompt 4 (duplex, N-up, quality, finishings, etc.) starts mapping to real hardware output. The same `e2e-sim.ts` harness, with the agent in `real` mode, becomes your on-site smoke test at each new shop.

---

## Quick reference

| What to verify | Command |
|---|---|
| Happy chain | `pnpm tsx scripts/e2e-sim.ts` |
| Refund path | `pnpm tsx scripts/e2e-sim.ts --mode fail` |
| Custom API target | `API_BASE=https://my-tunnel.ngrok.io pnpm tsx scripts/e2e-sim.ts` |
| Custom shop | `SHOP_ID=<uuid> pnpm tsx scripts/e2e-sim.ts` |
| Agent simulate log | `python apps/agent/agent.py` (watch stdout) |
| Dashboard | `http://localhost:3000/dashboard` |
