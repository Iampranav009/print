import { getSupabase } from "@/lib/supabase";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { advanceVirtualJob, isVirtualShop } from "@/lib/virtual-print";
import { broadcastToKiosk } from "@/lib/kiosk-broadcast";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let valid: boolean;
  try {
    valid = verifyWebhookSignature(rawBody, signature);
  } catch {
    return Response.json({ error: "Verification error" }, { status: 500 });
  }

  if (!valid) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event as string;

  if (eventType.startsWith("refund.")) {
    const refund = event.payload?.refund?.entity;
    if (refund?.id && ["pending", "processed", "failed"].includes(refund.status)) {
      const supabase = getSupabase();
      const { data: payment } = await supabase.from("payments")
        .update({ refund_status: refund.status })
        .eq("refund_id", refund.id)
        .select("print_job_id")
        .maybeSingle();
      if (payment && refund.status === "processed") {
        await supabase.from("payments").update({ status: "refunded" }).eq("print_job_id", payment.print_job_id);
        await supabase.from("print_jobs")
          .update({ status: "refunded" })
          .eq("id", payment.print_job_id)
          .eq("status", "print_failed");
      }
    }
    return Response.json({ ok: true });
  }

  if (eventType === "order.paid" || eventType === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    if (!payment) {
      return Response.json({ ok: true });
    }

    const orderId = payment.order_id as string;
    const paymentId = payment.id as string;

    const supabase = getSupabase();

    const { data: job } = await supabase
      .from("print_jobs")
      .select("id, status, shop_id, price_paise, file_path")
      .eq("razorpay_order_id", orderId)
      .single();

    if (!job) {
      return Response.json({ ok: true });
    }

    if (
      job.status === "paid" ||
      job.status === "dispatched" ||
      job.status === "awaiting_release" ||
      job.status === "released" ||
      job.status === "printing" ||
      job.status === "printed"
    ) {
      return Response.json({ ok: true });
    }

    const { data: capturedPayment, error: paymentError } = await supabase
      .from("payments")
      .update({
        razorpay_payment_id: paymentId,
        status: "captured",
      })
      .eq("razorpay_order_id", orderId)
      .select("id")
      .maybeSingle();
    if (paymentError || !capturedPayment) {
      return Response.json({ error: "Payment record unavailable" }, { status: 503 });
    }

    const { error: dispatchError } = await supabase
      .from("print_jobs")
      .update({
        status: "dispatched",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .in("status", ["priced", "awaiting_payment", "payment_failed"]);
    if (dispatchError) return Response.json({ error: "Dispatch failed" }, { status: 503 });

    // Kiosk WebSocket: push a payment-success event immediately so the
    // kiosk display swaps to "Payment successful" without waiting for
    // postgres_changes (which anon-key subscribers may not receive when
    // RLS is enabled on print_jobs).
    const fileName = (job.file_path as string | null)?.split("/").pop()?.replace(/^\d+_/, "");
    await broadcastToKiosk(job.shop_id, {
      type: "payment:success",
      jobId: job.id,
      amountPaise: job.price_paise ?? 0,
      fileName,
      sentAt: new Date().toISOString(),
    });

    // Virtual-mode shops have no real printer — advance the job through the
    // rest of the pipeline on a timer so the mobile app and kiosk see the
    // full flow. Real shops let the Python agent drive from here.
    if (await isVirtualShop(job.shop_id)) {
      advanceVirtualJob(job.id);
    }
  }

  if (eventType === "payment.failed") {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id) {
      const supabase = getSupabase();

      const { data: job } = await supabase
        .from("print_jobs")
        .select("id, shop_id")
        .eq("razorpay_order_id", payment.order_id)
        .single();

      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("razorpay_order_id", payment.order_id)
        .eq("status", "pending");

      await supabase
        .from("print_jobs")
        .update({
          status: "payment_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", payment.order_id)
        .in("status", ["priced", "awaiting_payment"]);

      if (job) {
        await broadcastToKiosk(job.shop_id, {
          type: "payment:failed",
          jobId: job.id,
          reason: payment.error_description ?? "Payment was rejected",
          sentAt: new Date().toISOString(),
        });
      }
    }
  }

  return Response.json({ ok: true });
}
