import { getSupabase } from "@/lib/supabase";
import { computePrice } from "@/lib/pricing";
import type { PrintOptions, Pricing } from "@printbuddy/shared";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { shopId, totalPages, options } = (await req.json()) as {
    shopId: string;
    totalPages: number;
    options: Partial<PrintOptions>;
  };

  if (!shopId || !totalPages || !options) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: pricing } = await supabase
    .from("pricing")
    .select(
      "bw_page_paise, color_page_paise, a3_multiplier, duplex_factor, min_charge_paise, media_type_surcharges"
    )
    .eq("shop_id", shopId)
    .single();

  if (!pricing) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  const safeOptions: PrintOptions = {
    copies: options.copies ?? 1,
    color: options.color ?? false,
    orientation: options.orientation ?? "portrait",
    paper: options.paper ?? "A4",
    duplex: options.duplex ?? false,
    duplex_edge: (options.duplex_edge as "long" | "short") ?? "long",
    pageRange: options.pageRange ?? null,
    numberUp: options.numberUp ?? 1,
    collate: options.collate ?? true,
    quality: (options.quality as "draft" | "normal" | "high") ?? "normal",
    mediaType: options.mediaType ?? "plain",
    reverse: options.reverse ?? false,
    scaling:
      (options.scaling as "none" | "fit-to-page" | "shrink-to-fit") ?? "none",
    finishings: options.finishings ?? [],
  };

  const breakdown = computePrice(pricing as Pricing, safeOptions, totalPages);
  return Response.json({ pricePaise: breakdown.price_paise, breakdown });
}
