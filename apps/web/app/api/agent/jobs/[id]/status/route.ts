import { getSupabase } from "@/lib/supabase";
import { resolveAgentToken } from "@/lib/agent-auth";
import { refundFailedJob } from "@/lib/refunds";
import { deleteDocuments, scheduleCleanup } from "@/lib/retention";
import { broadcastToKiosk } from "@/lib/kiosk-broadcast";
import { NextRequest, after } from "next/server";
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
  // A print_failed report may have reached us successfully even when the
  // agent lost the HTTP response. The server can then refund the payment
  // before the agent retries its durable pending-status file. Treat that
  // refunded row as an acknowledged failure so an existing Windows agent
  // does not block its entire queue forever.
  if (newStatus === "print_failed" && job.status === "refunded") {
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

  if (newStatus === "print_failed") {
    await refundFailedJob(job);
  }

  if (newStatus === "printed" && job.file_path) {
    after(() => deleteDocuments([job.file_path]));
  }
  scheduleCleanup();

  return Response.json({ ok: true });
}
