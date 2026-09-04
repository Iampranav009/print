import { getSupabase } from "@/lib/supabase";
import { resolveAgentToken } from "@/lib/agent-auth";
import { createRefund } from "@/lib/razorpay";
import { NextRequest } from "next/server";
import type { JobStatus } from "@printbuddy/shared";

const VALID_TRANSITIONS: Partial<Record<JobStatus, JobStatus[]>> = {
  dispatched: ["awaiting_release"],
  awaiting_release: ["released"],
  released: ["printing"],
  printing: ["printed", "print_failed"],
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await resolveAgentToken(req.headers.get("authorization"));
  if (!agent) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const newStatus = body.status as JobStatus;
  const failureReason = body.reason as string | undefined;

  const supabase = getSupabase();

  const { data: job } = await supabase
    .from("print_jobs")
    .select("id, status, shop_id, razorpay_order_id, price_paise")
    .eq("id", id)
    .single();

  if (!job || job.shop_id !== agent.shopId) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[job.status as JobStatus];
  if (!allowed?.includes(newStatus)) {
    return Response.json(
      { error: `Invalid transition: ${job.status} -> ${newStatus}` },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (failureReason) updateData.failure_reason = failureReason;

  await supabase.from("print_jobs").update(updateData).eq("id", id);

  if (newStatus === "print_failed" && job.razorpay_order_id) {
    try {
      const { data: payment } = await supabase
        .from("payments")
        .select("razorpay_payment_id")
        .eq("razorpay_order_id", job.razorpay_order_id)
        .eq("status", "captured")
        .single();

      if (payment?.razorpay_payment_id) {
        const refund = await createRefund(
          payment.razorpay_payment_id,
          job.price_paise
        );

        await supabase
          .from("payments")
          .update({
            refund_id: refund.id,
            refund_status: "initiated",
          })
          .eq("razorpay_order_id", job.razorpay_order_id);

        await supabase
          .from("print_jobs")
          .update({
            status: "refunded",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      }
    } catch {
      // Refund failed — logged but doesn't block the status update
    }
  }

  if (newStatus === "printed") {
    supabase.storage
      .from("documents")
      .remove([job.id])
      .catch(() => {});
  }

  return Response.json({ ok: true });
}
