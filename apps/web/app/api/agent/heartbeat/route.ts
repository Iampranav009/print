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

  const supabase = getSupabase();

  await supabase
    .from("agents")
    .update({
      last_heartbeat: new Date().toISOString(),
      status: "online",
    })
    .eq("id", agent.agentId);

  if (printerStatus) {
    await supabase
      .from("printers")
      .update({ status: printerStatus })
      .eq("shop_id", agent.shopId);
  }

  return Response.json({ ok: true });
}
