import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  if (!shopId) {
    return Response.json({ error: "Missing shopId" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: agents } = await supabase
    .from("agents")
    .select("id, status, last_heartbeat, platform")
    .eq("shop_id", shopId);

  return Response.json({ agents: agents || [] });
}
