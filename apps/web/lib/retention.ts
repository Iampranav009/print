import { after } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { refundFailedJob } from "@/lib/refunds";
import { broadcastToKiosk } from "@/lib/kiosk-broadcast";

/** How long things live, in minutes. The privacy and refund pages describe these numbers. */
export const RETENTION = {
  /** A document is kept this long after its job finishes (printed, failed, refunded, expired). */
  finishedFile: 5,
  /** An unpaid order, or an upload never turned into an order, expires after this. */
  unpaid: 20,
  /** A paid order that hasn't printed by now is failed and refunded instead of printing late. */
  waitingToPrint: 30,
};

export const WAITING_TO_PRINT = ["paid", "dispatched", "awaiting_release", "released", "printing"];
const UNPAID = ["priced", "awaiting_payment", "payment_failed"];

export function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export async function deleteDocuments(paths: string[]) {
  const storage = getSupabase().storage.from("documents");
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { error } = await storage.remove(batch);
    if (error) console.error("[retention] Could not delete documents", { count: batch.length, error });
  }
}

/** Closes unpaid orders and fails (and refunds) paid orders that never printed. */
export async function expireStaleJobs() {
  const supabase = getSupabase();

  const { data: expired, error: expireError } = await supabase
    .from("print_jobs")
    .update({ status: "expired" })
    .in("status", UNPAID)
    .lt("updated_at", minutesAgo(RETENTION.unpaid))
    .select("id");
  if (expireError) console.error("[retention] Could not expire unpaid jobs", expireError);
  if (expired?.length) {
    await supabase
      .from("payments")
      .update({ status: "failed" })
      .in("print_job_id", expired.map((job) => job.id))
      .eq("status", "pending");
  }

  const { data: stale, error: staleError } = await supabase
    .from("print_jobs")
    .select("id, status, shop_id")
    .in("status", WAITING_TO_PRINT)
    .lt("updated_at", minutesAgo(RETENTION.waitingToPrint))
    .limit(50);
  if (staleError) console.error("[retention] Could not read stale jobs", staleError);

  let failedCount = 0;
  for (const job of stale ?? []) {
    const reason = `Not printed within ${RETENTION.waitingToPrint} minutes of payment.`;
    // Conditional on the old status so a printer picking it up at the same moment wins cleanly.
    const { data: failed } = await supabase
      .from("print_jobs")
      .update({ status: "print_failed", failure_reason: reason })
      .eq("id", job.id)
      .eq("status", job.status)
      .select("id, razorpay_order_id, price_paise")
      .maybeSingle();
    if (!failed) continue;
    failedCount++;
    await refundFailedJob(failed);
    await broadcastToKiosk(job.shop_id, { type: "print:failed", jobId: job.id, reason, sentAt: new Date().toISOString() });
  }

  return { expired: expired?.length ?? 0, failed: failedCount };
}

/** Deletes documents of finished jobs and abandoned uploads. */
export async function purgeExpiredFiles() {
  const { data, error } = await getSupabase().rpc("expired_document_paths", {
    finished_minutes: RETENTION.finishedFile,
    orphan_minutes: RETENTION.unpaid,
    max_rows: 500,
  });
  if (error) {
    console.error("[retention] Could not list expired documents", error);
    return 0;
  }
  const paths = ((data ?? []) as { path: string }[]).map((row) => row.path);
  if (paths.length) await deleteDocuments(paths);
  return paths.length;
}

export async function runCleanup() {
  const jobs = await expireStaleJobs();
  const deletedFiles = await purgeExpiredFiles();
  return { ...jobs, deletedFiles };
}

let lastRun = 0;

/** Runs cleanup after the current response, at most once a minute per server instance. */
export function scheduleCleanup() {
  // Dev shares the live database but uses sandbox Cashfree keys, which can't refund live payments.
  if (process.env.NODE_ENV !== "production") return;
  if (Date.now() - lastRun < 60_000) return;
  lastRun = Date.now();
  after(() => runCleanup().then(
    () => undefined,
    (error) => console.error("[retention] Cleanup failed", error),
  ));
}
