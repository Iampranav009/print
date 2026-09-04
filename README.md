# PrintBuddy

Self-serve print platform — customers scan a shop QR code, upload a document, configure print options, pay via UPI, and pick up their printout.

## Architecture

```
Customer phone  →  Next.js PWA  →  Supabase (Postgres + Storage)
                                        ↓ webhook-gated dispatch
                                   Print Agent (Python, CUPS/SumatraPDF)
                                        ↓
                                   Shop printer
```

Monorepo layout:

| Path                | What                                        |
|---------------------|---------------------------------------------|
| `apps/web`          | Next.js 16 — customer PWA, API, dashboard   |
| `apps/agent`        | Python print agent (Pi / Windows)           |
| `packages/shared`   | Shared TypeScript types                     |
| `supabase/`         | Migrations and seed                         |

## Local Setup

### Prerequisites

- **Node.js** 20+  
- **npm** 10+  
- A free **Supabase** project (hosted or self-hosted)  
- A **Razorpay** test-mode account  

### 1. Clone and install

```bash
git clone <repo-url> && cd print-software
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Once ready, go to **Project Settings > API** and copy:
   - **Project URL** (e.g. `https://abc123.supabase.co`)
   - **anon / public** key
   - **service_role** key (keep this secret)

### 3. Run the migrations

Open the **SQL Editor** in the Supabase dashboard and run these files in order:

1. `supabase/migrations/0001_init.sql` — creates tables, indexes, RLS
2. `supabase/migrations/0002_storage.sql` — creates the private `documents` bucket
3. `supabase/migrations/0003_capabilities.sql` — adds printer capabilities column
4. `supabase/migrations/0004_job_options.sql` — extended print options + media surcharges
5. `supabase/migrations/0005_capabilities_provenance.sql` — adds `capabilities_source`, `make_and_model`, `capabilities_updated_at`; expands default capability set with finishings

Then run the seed:

4. `supabase/seed.sql` — inserts the pilot shop and generates an agent token

After running the seed, check the **Messages** tab for output like:

```
PILOT SHOP ID  : 00000000-0000-0000-0000-000000000001
AGENT TOKEN    : a1b2c3d4...
```

Copy the `AGENT TOKEN` — you'll need it for the agent env.

> **Alternative (Supabase CLI):** If you have the CLI set up, run:
> ```bash
> supabase db push
> supabase db seed
> ```

### 4. Set up Razorpay (test mode)

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com) and switch to **Test Mode**.
2. Go to **Settings > API Keys** and generate a test key pair. The Key ID will start with `rzp_test_`.
3. Expose localhost so Razorpay can reach your webhook. Pick any tunnel tool:

   ```bash
   # ngrok (most common)
   ngrok http 3000
   # or cloudflared
   cloudflare tunnel --url http://localhost:3000
   ```

   > **Tunnel gotcha**: Razorpay caches the webhook URL. If you restart your tunnel and get a new hostname, update the webhook URL in the Razorpay dashboard and allow ~60 s for propagation.

4. Go to **Settings > Webhooks**, click **Add New Webhook**:
   - URL: `https://<your-tunnel-hostname>/api/webhooks/razorpay`
   - Events: `order.paid`, `payment.captured`, `payment.failed`
   - Copy the **Webhook Secret** shown after saving.

**Test VPA for UPI payments:** Use `success@razorpay` as the UPI ID in the checkout to simulate a successful payment, or `failure@razorpay` to simulate a failure.

### 5. Configure environment variables

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Fill in `apps/web/.env.local`:

| Variable                         | Where to get it               |
|----------------------------------|-------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase dashboard > API      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase dashboard > API      |
| `SUPABASE_SERVICE_ROLE_KEY`      | Supabase dashboard > API      |
| `RAZORPAY_KEY_ID`                | Razorpay dashboard > API Keys |
| `RAZORPAY_KEY_SECRET`            | Razorpay dashboard > API Keys |
| `RAZORPAY_WEBHOOK_SECRET`        | Razorpay dashboard > Webhooks |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`    | Same as `RAZORPAY_KEY_ID`     |

For the agent (optional, only needed to run the print agent):

```bash
cp apps/agent/.env.example apps/agent/.env
```

Fill in `AGENT_TOKEN` with the value from the seed output.

### 6. Start the dev server

```bash
npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000).

### 7. Verify the setup

Open in your browser or run:

```bash
curl http://localhost:3000/api/health
```

You should see:

```json
{
  "status": "healthy",
  "checks": {
    "supabase": { "ok": true },
    "storage": { "ok": true, "detail": "public=false" },
    "pilotShop": { "ok": true, "detail": "Pilot Shop" },
    "razorpay": { "ok": true }
  }
}
```

If any check fails, the response will be `503` with details on what's missing.

### 8. Test the customer flow

Open [http://localhost:3000/s/00000000-0000-0000-0000-000000000001](http://localhost:3000/s/00000000-0000-0000-0000-000000000001) to see the pilot shop page.

### 9. Run the E2E simulation (no printer, no phone)

Validates the full chain — upload → job → payment → agent pickup → release → print — using simulate mode and a HMAC-signed synthetic webhook.

```bash
# Happy path
npx tsx scripts/e2e-sim.ts

# Failure + auto-refund path
npx tsx scripts/e2e-sim.ts --fail jam
```

The script reads `apps/web/.env.local` automatically. It aborts if `RAZORPAY_KEY_ID` is not a test key.

#### Dashboard simulate controls

If you have a Razorpay test key configured, the dashboard at [http://localhost:3000/dashboard](http://localhost:3000/dashboard) shows a **Dev: Simulate** panel with:

- **Happy Path** — creates a test job, dispatches it, walks it to `printed`
- **Failure + Refund** — same, but ends with `print_failed` and triggers the refund flow

The panel is hidden automatically in production (live Razorpay key).

## Running the Print Agent

See `apps/agent/.env.example` for all variables.

### Print modes

Set `PRINTBUDDY_PRINT_MODE` in `apps/agent/.env`:

| Mode       | What happens                                                                 | Needs a printer? |
|------------|------------------------------------------------------------------------------|-------------------|
| `simulate` | Logs the exact CUPS/SumatraPDF command, sleeps, reports `printed`            | No                |
| `virtual`  | Sends to a cups-pdf virtual queue — exercises the real CUPS code path        | No (cups-pdf)     |
| `real`     | Sends to a physical printer via CUPS (Linux) or SumatraPDF (Windows)         | Yes               |

All modes follow the same state machine: `dispatched` -> `awaiting_release` -> wait -> `released` -> download -> `printing` -> `printed`. The temp file is always deleted after the run.

### Quick start (simulate mode — no printer)

```bash
cd apps/agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: set AGENT_TOKEN from seed output, keep PRINTBUDDY_PRINT_MODE=simulate
python agent.py
```

### Testing the refund path

Set `SIMULATE_FAIL=jam` (or `out_of_paper`, `offline`) in `apps/agent/.env`, then trigger a job. The agent will report `print_failed` with that reason and the server auto-refunds.

### Virtual printer (cups-pdf)

To exercise the real CUPS option mapping without a physical printer:

```bash
# Debian/Ubuntu/Pi
sudo apt install printer-driver-cups-pdf
lpstat -a  # note the queue name, usually "PDF" or "Virtual_PDF_Printer"
```

Set in `.env`:

```
PRINTBUDDY_PRINT_MODE=virtual
PRINTER_NAME=PDF
```

Output PDFs land in `~/PDF/` by default.

### Printer capability detection

In `virtual` and `real` modes, the agent queries the printer's IPP attributes on startup and every 10th heartbeat, maps them to a standard capability shape, and posts them to the server. The customer config screen then shows only what the printer actually supports.

In `simulate` mode, default capabilities are used (all features enabled).

### Production (systemd on Pi)

```bash
sudo cp install/printbuddy-agent.service /etc/systemd/system/
sudo systemctl enable --now printbuddy-agent
```
