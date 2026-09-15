import { createHash, randomBytes } from "node:crypto";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body: { token?: unknown } = await req.json().catch(() => ({}));
  if (typeof body?.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) {
    return Response.json({ error: "Invalid connection link." }, { status: 400 });
  }
  const db = getSupabase();
  const now = new Date().toISOString();
  // Conditional UPDATE atomically consumes the link; concurrent replays cannot win twice.
  const { data: pairing, error } = await db.from("agent_pairings")
    .update({ used_at: now }).eq("token_hash", createHash("sha256").update(body.token).digest("hex"))
    .is("used_at", null).gt("expires_at", now).select("agent_id").maybeSingle();
  if (error) return Response.json({ error: "Could not verify the link. Try again shortly." }, { status: 503 });
  if (!pairing) return Response.json({ error: "This link expired or was already used. Get a new link from the dashboard." }, { status: 410 });
  // Replace the previous device credential so two shop PCs cannot consume the same queue.
  const { data: agent } = await db.from("agents").update({ agent_token: randomBytes(32).toString("hex"), status: "offline" })
    .eq("id", pairing.agent_id).select("agent_token, shop_id").single();
  if (!agent) return Response.json({ error: "Shop connection unavailable. Generate a new link." }, { status: 503 });
  const { data: shop } = await db.from("shops").select("name").eq("id", agent.shop_id).single();
  return Response.json({ agentToken: agent.agent_token, shopId: agent.shop_id, shopName: shop?.name ?? "Your shop" }, { headers: { "Cache-Control": "no-store" } });
}
