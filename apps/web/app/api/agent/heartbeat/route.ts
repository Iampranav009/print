import { getSupabase } from "@/lib/supabase";
import { resolveAgentToken } from "@/lib/agent-auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const agent = await resolveAgentToken(req.headers.get("authorization"));
  if (!agent) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const printerStatus = body.printerStatus as string | undefined;
  const now = new Date().toISOString();

  const supabase = getSupabase();

  await supabase
    .from("agents")
    .update({
      last_heartbeat: now,
      status: "online",
    })
    .eq("id", agent.agentId);

  // Also mark the shop's printer as online + timestamped so the vendor
  // dashboard status pill and kiosk offline banner flip immediately —
  // no separate probe needed.
  await supabase
    .from("printers")
    .update({
      online: true,
      last_seen_at: now,
      ...(printerStatus ? { status: printerStatus } : {}),
    })
    .eq("shop_id", agent.shopId);

  return Response.json({ ok: true });
}
