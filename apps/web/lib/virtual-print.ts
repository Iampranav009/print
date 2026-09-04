// Virtual print mode: for shops with virtual_mode = true, the web backend
// itself advances jobs through the full print pipeline on a timer, letting
// the whole flow be demoed and tested without a real printer or the Python
// agent. Fire-and-forget from the Razorpay webhook.
//
// Auto-print flow (no release-code entry required):
//   paid/dispatched -> (3s: prepping) -> printing -> (10s: printing) -> printed
//
// Every status change is both written to the DB and broadcast to the kiosk
// channel so the kiosk display can react without relying on
// postgres_changes (which RLS blocks for anon subscribers).

import { getSupabase } from "@/lib/supabase";
import { broadcastToKiosk } from "@/lib/kiosk-broadcast";

const DOWNLOAD_MS = 3_000;   // dispatched -> printing
const PRINT_MS    = 10_000;  // printing -> printed

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function loadJob(jobId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("print_jobs")
    .select("id, status, shop_id, file_path")
    .eq("id", jobId)
    .single();
  return data as
    | { id: string; status: string; shop_id: string; file_path: string | null }
    | null;
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
      const initial = await loadJob(jobId);
      if (!initial) return;
      const shopId = initial.shop_id;
      const fileName = initial.file_path?.split("/").pop()?.replace(/^\d+_/, "");

      await sleep(DOWNLOAD_MS);
      if (await isTerminal(jobId)) return;
      await setStatus(jobId, "printing");
      await broadcastToKiosk(shopId, {
        type: "print:started",
        jobId,
        fileName,
        sentAt: new Date().toISOString(),
      });

      await sleep(PRINT_MS);
      if (await isTerminal(jobId)) return;
      // Skip awaiting_release — auto-print completes directly to printed.
      await setStatus(jobId, "printed");
      await broadcastToKiosk(shopId, {
        type: "print:completed",
        jobId,
        fileName,
        sentAt: new Date().toISOString(),
      });
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
