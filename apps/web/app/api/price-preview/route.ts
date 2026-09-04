// POST /api/price-preview — compute a live price without creating a job.
// Accepts either the original shape { shopId, totalPages, options } or a
// flat shape { shopId, pageCount, copies, color, duplex, paper, ... } that
// the mobile print page sends.

import { getSupabase } from "@/lib/supabase";
import { computePrice } from "@/lib/pricing";
import type { PrintOptions, Pricing } from "@printbuddy/shared";
import { NextRequest } from "next/server";

interface Body {
  shopId?: string;
  totalPages?: number;
  pageCount?: number;
  options?: Partial<PrintOptions>;
  // Flat client shape
  copies?: number;
  color?: boolean;
  orientation?: PrintOptions["orientation"];
  paper?: string;
  duplex?: boolean;
  duplex_edge?: PrintOptions["duplex_edge"];
  pageRange?: string | null;
  range?: string | null;
  numberUp?: number;
  number_up?: number;
  collate?: boolean;
  quality?: PrintOptions["quality"];
  mediaType?: string;
  media_type?: string;
  reverse?: boolean;
  scaling?: PrintOptions["scaling"];
  finishings?: string[];
}

const VIRTUAL_SHOP_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;

  // Accept both { totalPages } and { pageCount }
  const totalPages = body.totalPages ?? body.pageCount;

  // Accept nested { options } or a flat body
  const flatOptions: Partial<PrintOptions> = body.options ?? {
    copies: body.copies,
    color: body.color,
    orientation: body.orientation,
    paper: body.paper,
    duplex: body.duplex,
    duplex_edge: body.duplex_edge,
    pageRange: body.pageRange ?? body.range ?? null,
    numberUp: body.numberUp ?? body.number_up,
    collate: body.collate,
    quality: body.quality,
    mediaType: body.mediaType ?? body.media_type,
    reverse: body.reverse,
    scaling: body.scaling,
    finishings: body.finishings,
  };

  const shopId =
    body.shopId && body.shopId !== "virtual" ? body.shopId : VIRTUAL_SHOP_ID;

  if (!totalPages || totalPages < 1) {
    return Response.json({ error: "totalPages is required" }, { status: 400 });
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
    copies: flatOptions.copies ?? 1,
    color: flatOptions.color ?? false,
    orientation: flatOptions.orientation ?? "portrait",
    paper: flatOptions.paper ?? "A4",
    duplex: flatOptions.duplex ?? false,
    duplex_edge: (flatOptions.duplex_edge as "long" | "short") ?? "long",
    pageRange: flatOptions.pageRange ?? null,
    numberUp: flatOptions.numberUp ?? 1,
    collate: flatOptions.collate ?? true,
    quality: (flatOptions.quality as "draft" | "normal" | "high") ?? "normal",
    mediaType: flatOptions.mediaType ?? "plain",
    reverse: flatOptions.reverse ?? false,
    scaling:
      (flatOptions.scaling as "none" | "fit-to-page" | "shrink-to-fit") ?? "none",
    finishings: flatOptions.finishings ?? [],
  };

  const breakdown = computePrice(pricing as Pricing, safeOptions, totalPages);
  return Response.json({ pricePaise: breakdown.price_paise, breakdown });
}
