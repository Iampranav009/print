import { createHash } from "node:crypto";
import { getSupabase } from "./supabase";

export async function resolveAgentToken(
  authHeader: string | null
): Promise<{ shopId: string; agentId: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await getSupabase()
    .from("agents")
    .select("id, shop_id")
    .eq("agent_token_hash", tokenHash)
    .single();

  if (error || !data) return null;
  return { shopId: data.shop_id, agentId: data.id };
}
