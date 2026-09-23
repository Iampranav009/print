import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";
import { getRazorpay } from "@/lib/razorpay";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: job, error } = await supabase
    .from("print_jobs")
    .select("id, shop_id, status, price_paise, pages, copies, color, paper, duplex, orientation, release_code, failure_reason, razorpay_order_id, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const [{ data: ahead }, { data: payment }] = await Promise.all([
    supabase.from("print_jobs")
      .select("id, status, created_at, updated_at")
      .eq("shop_id", job.shop_id)
      .in("status", ["dispatched", "awaiting_release", "released", "printing"])
      .order("updated_at", { ascending: true })
      .limit(100),
    supabase.from("payments")
      .select("refund_id, refund_status, razorpay_payment_id")
      .eq("print_job_id", id)
      .maybeSingle(),
  ]);
  const ordered = [...(ahead ?? [])].sort((a, b) =>
    Number(b.status === "printing") - Number(a.status === "printing") ||
    new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
  );
  const place = ordered.findIndex((item) => item.id === id);
  let refundStatus = payment?.refund_status ?? null;
  let refundId = payment?.refund_id ?? null;
  const paymentId = payment?.razorpay_payment_id;
  if (job.status === "print_failed" && !refundId && paymentId) {
    // A refund request may have reached Razorpay even if our response or DB
    // write failed. Reconcile by our receipt before telling the customer.
    try {
      const refunds = await getRazorpay().payments.fetchMultipleRefund(paymentId);
      const matching = refunds.items.find((refund) => refund.receipt === id);
      if (matching) {
        refundId = matching.id;
        refundStatus = matching.status;
        await supabase.from("payments").update({ refund_id: refundId, refund_status: refundStatus }).eq("print_job_id", id);
        if (matching.status === "processed") {
          await supabase.from("payments").update({ status: "refunded" }).eq("print_job_id", id);
          await supabase.from("print_jobs").update({ status: "refunded" }).eq("id", id).eq("status", "print_failed");
          job.status = "refunded";
        }
      }
    } catch (error) {
      console.error("[jobs] Refund reconciliation failed", { jobId: id, error });
    }
  }
  if (refundId && refundStatus !== "processed" && refundStatus !== "failed") {
    try {
      const refund = await getRazorpay().refunds.fetch(refundId);
      const previousRefundStatus = refundStatus;
      refundStatus = refund.status;
      if (refund.status !== previousRefundStatus) {
        await supabase.from("payments").update({ refund_status: refund.status }).eq("print_job_id", id);
      }
      if (refund.status === "processed" && job.status === "print_failed") {
        await supabase.from("payments").update({ status: "refunded" }).eq("print_job_id", id);
        await supabase.from("print_jobs").update({ status: "refunded" }).eq("id", id).eq("status", "print_failed");
        job.status = "refunded";
      }
    } catch (error) {
      console.error("[jobs] Refund status check failed", { jobId: id, error });
    }
  }
  return Response.json({
    job: { ...job, queueAhead: place >= 0 ? place : 0, estimatedWaitMinutes: place > 0 ? Math.max(1, Math.ceil(place * 1.5)) : 0,
      refundStatus, refundId },
  }, { headers: { "Cache-Control": "no-store" } });
}
