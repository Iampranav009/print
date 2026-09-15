import { randomBytes, createHash } from "node:crypto";
import { vendorShopId } from "@/lib/vendor-shop";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const shopId = await vendorShopId();
  if (!shopId) return Response.json({ error: "Sign in as the shop owner." }, { status: 401 });
  const db = getSupabase();
  let { data: agent } = await db.from("agents").select("id").eq("shop_id", shopId)
    .order("id").limit(1).maybeSingle();
  if (!agent) {
    const created = await db.from("agents").insert({ shop_id: shopId, agent_token: randomBytes(32).toString("hex"), platform: "windows", status: "offline" }).select("id").single();
    if (created.error) return Response.json({ error: "Could not prepare this shop." }, { status: 503 });
    agent = created.data;
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  // One outstanding link per agent; issuing another invalidates the previous link.
  const { error } = await db.from("agent_pairings").upsert({
    agent_id: agent.id, token_hash: createHash("sha256").update(token).digest("hex"),
    expires_at: expiresAt, used_at: null,
  }, { onConflict: "agent_id" });
  if (error) return Response.json({ error: "Connection links are unavailable. Please contact PrintBuddy support." }, { status: 503 });
  const origin = new URL(req.url).origin;
  return Response.json({ link: `${origin}/agent/connect#${token}`, expiresAt }, { headers: { "Cache-Control": "no-store" } });
}
