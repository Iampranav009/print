import { getSupabase } from "@/lib/supabase";
import { resolveAgentToken } from "@/lib/agent-auth";
import { createRefund } from "@/lib/razorpay";
import { broadcastToKiosk } from "@/lib/kiosk-broadcast";
import { NextRequest } from "next/server";
import type { JobStatus } from "@printbuddy/shared";

const VALID_TRANSITIONS: Partial<Record<JobStatus, JobStatus[]>> = {
  dispatched: ["awaiting_release", "printing", "print_failed"],
  awaiting_release: ["released", "printing", "print_failed"],
  released: ["printing", "print_failed"],
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
    .select("id, status, shop_id, razorpay_order_id, price_paise, file_path")
    .eq("id", id)
    .single();

  if (!job || job.shop_id !== agent.shopId) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status === newStatus) {
    return Response.json({ ok: true, alreadyRecorded: true });
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

  const { data: changed, error: changeError } = await supabase
    .from("print_jobs")
    .update(updateData)
    .eq("id", id)
    .eq("status", job.status)
    .select("id")
    .maybeSingle();
  if (changeError) return Response.json({ error: "Status update failed" }, { status: 503 });
  if (!changed) return Response.json({ error: "Job status changed; retry safely" }, { status: 409 });

  const fileName = job.file_path?.split("/").pop()?.replace(/^\d+_/, "");
  if (newStatus === "printing") {
    await broadcastToKiosk(job.shop_id, { type: "print:started", jobId: id, fileName, sentAt: new Date().toISOString() });
  } else if (newStatus === "printed") {
    await broadcastToKiosk(job.shop_id, { type: "print:completed", jobId: id, fileName, sentAt: new Date().toISOString() });
  } else if (newStatus === "print_failed") {
    await broadcastToKiosk(job.shop_id, { type: "print:failed", jobId: id, reason: failureReason, sentAt: new Date().toISOString() });
  }

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
          job.price_paise,
          job.id
        );

        const { error: refundSaveError } = await supabase
          .from("payments")
          .update({
            refund_id: refund.id,
            refund_status: refund.status,
          })
          .eq("razorpay_order_id", job.razorpay_order_id);
        if (refundSaveError) throw refundSaveError;

        if (refund.status === "processed") {
          await supabase.from("payments").update({ status: "refunded" }).eq("razorpay_order_id", job.razorpay_order_id);
          await supabase.from("print_jobs").update({ status: "refunded" }).eq("id", id).eq("status", "print_failed");
        }
      } else {
        console.error("[refund] Captured payment not found for failed job", { jobId: id });
      }
    } catch (error) {
      console.error("[refund] Could not initiate refund", { jobId: id, error });
      await supabase.from("payments").update({ refund_status: "failed" }).eq("razorpay_order_id", job.razorpay_order_id);
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
