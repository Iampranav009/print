import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  if (!shopId) {
    return Response.json({ error: "Missing shopId" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: jobs } = await supabase
    .from("print_jobs")
    .select("id, status, pages, copies, color, paper, price_paise, created_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(50);

  return Response.json({ jobs: jobs || [] });
}
