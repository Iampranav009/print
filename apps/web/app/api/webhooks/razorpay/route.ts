import { getSupabase } from "@/lib/supabase";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { advanceVirtualJob, isVirtualShop } from "@/lib/virtual-print";
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
      .select("id, status, shop_id")
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

    await supabase
      .from("payments")
      .update({
        razorpay_payment_id: paymentId,
        status: "captured",
      })
      .eq("razorpay_order_id", orderId);

    await supabase
      .from("print_jobs")
      .update({
        status: "dispatched",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

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

      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("razorpay_order_id", payment.order_id);

      await supabase
        .from("print_jobs")
        .update({
          status: "payment_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", payment.order_id);
    }
  }

  return Response.json({ ok: true });
}
