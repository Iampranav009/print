import { createHash, randomBytes } from "node:crypto";
import { getSupabase } from "@/lib/supabase";
import { vendorShopId } from "@/lib/vendor-shop";

export class PairingLinkError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function createAgentPairing(origin: string) {
  const shopId = await vendorShopId();
  if (!shopId) throw new PairingLinkError("Sign in as the shop owner.", 401);

  const db = getSupabase();
  const existing = await db
    .from("agents")
    .select("id")
    .eq("shop_id", shopId)
    .order("id")
    .limit(1)
    .maybeSingle();
  if (existing.error) {
    console.error("Could not find the vendor agent", existing.error);
    throw new PairingLinkError("Could not prepare this shop.", 503);
  }

  let agent = existing.data;
  if (!agent) {
    const created = await db
      .from("agents")
      .insert({
        shop_id: shopId,
        agent_token: randomBytes(32).toString("hex"),
        platform: "windows",
        status: "offline",
      })
      .select("id")
      .single();
    if (created.error) {
      console.error("Could not create the vendor agent", created.error);
      throw new PairingLinkError("Could not prepare this shop.", 503);
    }
    agent = created.data;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const pairing = await db.from("agent_pairings").upsert(
    {
      agent_id: agent.id,
      token_hash: createHash("sha256").update(token).digest("hex"),
      expires_at: expiresAt,
      used_at: null,
    },
    { onConflict: "agent_id" }
  );
  if (pairing.error) {
    console.error("Could not create the agent pairing", pairing.error);
    throw new PairingLinkError(
      "Connection links are temporarily unavailable. Please try again.",
      503
    );
  }

  return { link: `${origin}/agent/connect#${token}`, expiresAt };
}

export async function pairingLinkResponse(req: Request) {
  try {
    const result = await createAgentPairing(new URL(req.url).origin);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof PairingLinkError) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("Unexpected connection-link error", error);
    return Response.json(
      { error: "Could not create the connection link. Please try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
