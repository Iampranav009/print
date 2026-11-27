import { getSupabase } from "@/lib/supabase";
import { createRefund, type RefundStatus } from "@/lib/cashfree";

interface FailedJob {
  id: string;
  razorpay_order_id: string | null;
  price_paise: number;
}

/**
 * Refunds the captured online payment of a job already marked print_failed.
 * Cash jobs (no order id) are settled at the counter, so they return null.
 */
export async function refundFailedJob(job: FailedJob): Promise<RefundStatus | null> {
  if (!job.razorpay_order_id) return null;
  const supabase = getSupabase();
  try {
    const { data: payment } = await supabase
      .from("payments")
      .select("razorpay_payment_id")
      .eq("razorpay_order_id", job.razorpay_order_id)
      .eq("status", "captured")
      .maybeSingle();

    if (!payment?.razorpay_payment_id) {
      console.error("[refund] Captured payment not found for failed job", { jobId: job.id });
      return null;
    }

    const refund = await createRefund(job.razorpay_order_id, job.price_paise, job.id);
    const { error: saveError } = await supabase
      .from("payments")
      .update({
        refund_id: refund.id,
        refund_status: refund.status,
        ...(refund.status === "processed" ? { status: "refunded" } : {}),
      })
      .eq("razorpay_order_id", job.razorpay_order_id);
    if (saveError) throw saveError;

    if (refund.status === "processed") {
      await supabase.from("print_jobs").update({ status: "refunded" }).eq("id", job.id).eq("status", "print_failed");
    }
    return refund.status;
  } catch (error) {
    console.error("[refund] Could not initiate refund", { jobId: job.id, error });
    await supabase.from("payments").update({ refund_status: "failed" }).eq("razorpay_order_id", job.razorpay_order_id);
    return null;
  }
}
