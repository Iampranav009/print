import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = getSupabase();

  const { data: shop, error: shopErr } = await supabase
    .from("shops")
    .select("id, name, location, status, virtual_mode")
    .eq("id", shopId)
    .single();

  if (shopErr || !shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  if (shop.status !== "active") {
    return Response.json({ error: "Shop is not active" }, { status: 404 });
  }

  const { data: pricing, error: pricingErr } = await supabase
    .from("pricing")
    .select(
      "bw_page_paise, color_page_paise, a3_multiplier, duplex_factor, min_charge_paise, media_type_surcharges"
    )
    .eq("shop_id", shopId)
    .single();

  if (pricingErr || !pricing) {
    return Response.json({ error: "Pricing not configured" }, { status: 500 });
  }

  const { data: printers } = await supabase
    .from("printers")
    .select(
      "capabilities, capabilities_source, make_and_model, capabilities_updated_at"
    )
    .eq("shop_id", shopId)
    .order("created_at", { ascending: true });

  const printerList = (printers ?? []).map((p) => ({
    capabilities: p.capabilities ?? null,
    capabilities_source: p.capabilities_source ?? "default",
    make_and_model: p.make_and_model ?? null,
    capabilities_updated_at: p.capabilities_updated_at ?? null,
  }));

  return Response.json({
    shop,
    pricing,
    printers: printerList,
    capabilities: printerList[0]?.capabilities ?? null,
  });
}
