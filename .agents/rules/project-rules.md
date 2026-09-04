# PrintBuddy Workspace Rules

These guidelines are automatically applied by the agent across the PrintBuddy project.

## Core Architectural Guardrails
1. **Never print on client-side payment confirmation:** Only dispatch print jobs after server-to-server Razorpay webhook signature verification.
2. **Outbound agent communication only:** Print agents run behind local shop NAT routers and must connect outbound (Supabase Realtime WebSocket). Never configure inbound listeners on the shop PC/Pi.
3. **OS-level print drivers:** Do not integrate vendor-specific SDKs. Standardize on CUPS (`pycups`) on Linux/Pi and SumatraPDF CLI with the Windows Print Spooler on Windows.
4. **Server-side normalization:** Normalize all uploads to print-ready PDF using LibreOffice headless and img2pdf. Compute exact page counts and color vs. B&W distribution on the backend.
5. **Locked pricing:** The price displayed to the customer is calculated from verified shop rates and normalized page counts. Price must be locked prior to payment.
6. **Privacy and ephemerality:** Store files in Supabase Storage with short-lived signed URLs. Auto-purge document files immediately upon print completion.
7. **Release codes:** Hold paid jobs until the customer confirms arrival ("I'm at the printer" or entering a 4-digit release code).
8. **Stack discipline:**
   - Frontend/Backend: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui.
   - Database/Auth/Storage/Realtime: Supabase (Postgres).
   - Print Agent: Python 3.
   - Payments: Razorpay (Orders API + Webhooks, UPI-first).
