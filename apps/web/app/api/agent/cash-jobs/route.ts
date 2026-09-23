import { getSupabase } from "@/lib/supabase";
import { resolveAgentToken } from "@/lib/agent-auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const agent = await resolveAgentToken(req.headers.get("authorization"));
  if (!agent) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getSupabase()
    .from("print_jobs")
    .select("id, display_name, pages, copies, color, paper, price_paise, created_at")
    .eq("shop_id", agent.shopId)
    .eq("payment_method", "cash")
    .eq("status", "awaiting_payment")
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) return Response.json({ error: "Could not load cash requests" }, { status: 503 });
  return Response.json({ jobs: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const agent = await resolveAgentToken(req.headers.get("authorization"));
  if (!agent) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { jobId?: string; decision?: "received" | "not_received" };
  if (!body.jobId || !["received", "not_received"].includes(body.decision ?? "")) {
    return Response.json({ error: "Invalid cash payment decision" }, { status: 400 });
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  const accepted = body.decision === "received";
  const { data: job, error } = await supabase
    .from("print_jobs")
    .update({
      status: accepted ? "dispatched" : "payment_failed",
      cash_decided_at: now,
      cash_decided_by: agent.agentId,
      failure_reason: accepted ? null : "Cash payment was not received",
    })
    .eq("id", body.jobId)
    .eq("shop_id", agent.shopId)
    .eq("payment_method", "cash")
    .eq("status", "awaiting_payment")
    .select("id, status")
    .maybeSingle();

  if (error) return Response.json({ error: "Could not confirm cash payment" }, { status: 500 });
  if (!job) return Response.json({ error: "Cash request is no longer pending" }, { status: 409 });

  await supabase.from("payments").update({
    status: accepted ? "captured" : "failed",
    confirmed_at: now,
    confirmed_by_agent_id: agent.agentId,
  }).eq("print_job_id", body.jobId).eq("payment_method", "cash");

  return Response.json({ ok: true, status: job.status });
}
