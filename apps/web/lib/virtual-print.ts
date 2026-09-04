// Virtual print mode: for shops with virtual_mode = true, the web backend
// itself advances jobs through the full print pipeline on a timer, letting
// the whole flow be demoed and tested without a real printer or the Python
// agent. Fire-and-forget from the Razorpay webhook.
//
// Auto-print flow (no release-code entry required):
//   paid/dispatched -> (3s: prepping) -> printing -> (10s: printing) -> printed
//
// The awaiting_release step is skipped so the printer completes on its own
// as soon as the webhook confirms payment.

import { getSupabase } from "@/lib/supabase";

const DOWNLOAD_MS = 3_000;   // dispatched -> printing
const PRINT_MS    = 10_000;  // printing -> printed

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function setStatus(jobId: string, status: string) {
  const supabase = getSupabase();
  await supabase
    .from("print_jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

/**
 * Advance a paid job through the virtual print pipeline. Returns
 * immediately with a promise; the caller should fire-and-forget.
 * Cancels itself gracefully if the job is already terminal.
 */
export function advanceVirtualJob(jobId: string): Promise<void> {
  return (async () => {
    try {
      await sleep(DOWNLOAD_MS);
      if (await isTerminal(jobId)) return;
      await setStatus(jobId, "printing");

      await sleep(PRINT_MS);
      if (await isTerminal(jobId)) return;
      // Skip awaiting_release — auto-print completes directly to printed.
      await setStatus(jobId, "printed");
    } catch (err) {
      console.error("[virtual-print] advance failed", { jobId, err });
    }
  })();
}

async function isTerminal(jobId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("print_jobs")
    .select("status")
    .eq("id", jobId)
    .single();
  if (!data) return true;
  return [
    "printed",
    "payment_failed",
    "print_failed",
    "refunded",
  ].includes(data.status);
}

export async function isVirtualShop(shopId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("shops")
    .select("virtual_mode")
    .eq("id", shopId)
    .single();
  return !!data?.virtual_mode;
}
