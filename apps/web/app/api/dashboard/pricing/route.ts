import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    shopId,
    bw_page_paise,
    color_page_paise,
    a3_multiplier,
    duplex_factor,
    min_charge_paise,
    media_type_surcharges,
  } = body;

  if (!shopId) {
    return Response.json({ error: "Missing shopId" }, { status: 400 });
  }

  const supabase = getSupabase();

  const update: Record<string, unknown> = {
    bw_page_paise,
    color_page_paise,
    a3_multiplier,
    duplex_factor,
    min_charge_paise,
  };

  if (media_type_surcharges && typeof media_type_surcharges === "object") {
    update.media_type_surcharges = media_type_surcharges;
  }

  const { error } = await supabase
    .from("pricing")
    .update(update)
    .eq("shop_id", shopId);

  if (error) {
    return Response.json({ error: "Failed to update pricing" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
