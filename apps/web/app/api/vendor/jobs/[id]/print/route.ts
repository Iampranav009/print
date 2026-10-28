import { NextRequest } from "next/server";
import { vendorShopId } from "@/lib/vendor-shop";
import { getSupabase } from "@/lib/supabase";
import { broadcastToKiosk } from "@/lib/kiosk-broadcast";
import { createRefund } from "@/lib/razorpay";

const RETRYABLE = new Set(["dispatched", "awaiting_release", "released", "printing"]);
const PRINTING_RETRY_AFTER_MS = 10 * 60 * 1000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const shopId = await vendorShopId();
  if (!shopId) return Response.json({ error: "Sign in as the shop owner." }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabase();
  const { data: job, error: readError } = await supabase
    .from("print_jobs")
    .select("id, shop_id, status, updated_at")
    .eq("id", id)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (readError) return Response.json({ error: "Could not read this print job." }, { status: 503 });
  if (!job) return Response.json({ error: "Print job not found." }, { status: 404 });
  if (!RETRYABLE.has(job.status)) {
    return Response.json({ error: "This job is no longer waiting to print." }, { status: 409 });
  }

  const body = await req.json().catch(() => ({})) as { action?: "retry" | "fail" };
  const action = body.action ?? "retry";

  if (job.status === "printing") {
    const ageMs = Date.now() - new Date(job.updated_at).getTime();
    if (ageMs < PRINTING_RETRY_AFTER_MS) {
      return Response.json(
        { error: "This job may still be printing. Wait ten minutes before retrying to avoid duplicate pages." },
        { status: 409 }
      );
    }
  }

  if (action === "fail") {
    if (job.status !== "printing") {
      return Response.json({ error: "Only a stalled printing job can be marked failed here." }, { status: 409 });
    }
    const reason = "Vendor confirmed the stalled print did not complete.";
    const { data: failed, error: failError } = await supabase
      .from("print_jobs")
      .update({ status: "print_failed", failure_reason: reason, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("shop_id", shopId)
      .eq("status", "printing")
      .select("id, razorpay_order_id, price_paise")
      .maybeSingle();
    if (failError) return Response.json({ error: "Could not close the stalled job." }, { status: 503 });
    if (!failed) return Response.json({ error: "The job changed. Refresh the queue and try again." }, { status: 409 });

    let refundStatus: string | null = null;
    if (failed.razorpay_order_id) {
      try {
        const { data: payment } = await supabase
          .from("payments")
          .select("razorpay_payment_id")
          .eq("razorpay_order_id", failed.razorpay_order_id)
          .eq("status", "captured")
          .maybeSingle();
        if (payment?.razorpay_payment_id) {
          const refund = await createRefund(payment.razorpay_payment_id, failed.price_paise, id);
          refundStatus = refund.status;
          await supabase.from("payments").update({
            refund_id: refund.id,
            refund_status: refund.status,
            ...(refund.status === "processed" ? { status: "refunded" } : {}),
          }).eq("razorpay_order_id", failed.razorpay_order_id);
          if (refund.status === "processed") {
            await supabase.from("print_jobs").update({ status: "refunded" }).eq("id", id).eq("status", "print_failed");
          }
        }
      } catch (refundError) {
        console.error("Could not refund vendor-closed stalled job", { jobId: id, refundError });
        await supabase.from("payments").update({ refund_status: "failed" }).eq("razorpay_order_id", failed.razorpay_order_id);
      }
    }

    await broadcastToKiosk(shopId, {
      type: "print:failed",
      jobId: id,
      reason,
      sentAt: new Date().toISOString(),
    });
    return Response.json({ ok: true, status: refundStatus === "processed" ? "refunded" : "print_failed", refundStatus }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  const requestedAt = new Date().toISOString();
  const { data: changed, error } = await supabase
    .from("print_jobs")
    .update({
      status: "dispatched",
      failure_reason: job.status === "printing"
        ? "Vendor retried a stalled print job. Previous print completion was not confirmed."
        : null,
      updated_at: requestedAt,
    })
    .eq("id", id)
    .eq("shop_id", shopId)
    .eq("status", job.status)
    .select("id")
    .maybeSingle();
  if (error) return Response.json({ error: "Could not send this job to the printer." }, { status: 503 });
  if (!changed) return Response.json({ error: "The job changed. Refresh the queue and try again." }, { status: 409 });

  await broadcastToKiosk(shopId, {
    type: "kiosk:reset",
    requestedAt,
    sentAt: requestedAt,
  });

  return Response.json({ ok: true, status: "dispatched", requestedAt }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
