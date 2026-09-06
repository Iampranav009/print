// POST /api/agent/announcements/ack
// Marks a list of print_job IDs as having been announced, so the agent
// does not replay the same sound on the next poll cycle.

import { getSupabase } from "@/lib/supabase";
import { resolveAgentToken } from "@/lib/agent-auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const agent = await resolveAgentToken(req.headers.get("authorization"));
  if (!agent) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : [];

  if (ids.length === 0) {
    return Response.json({ ok: true, acked: 0 });
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("print_jobs")
    .update({ sound_ack_at: now })
    .eq("shop_id", agent.shopId)
    .in("id", ids)
    .select("id");

  return Response.json({ ok: true, acked: data?.length ?? 0 });
}
