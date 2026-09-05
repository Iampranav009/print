// GET /api/vendor/pricing — read the shop's current per-page pricing.
// PUT /api/vendor/pricing — partner customises B&W, color, duplex factor,
//                           minimum charge. All amounts in paise (integer).
//
// The pricing row already exists per shop (seeded on shop creation). This
// endpoint just upserts.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

async function getShop() {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return { user: null, shopId: null };
  const supabase = getSupabase();
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  return { user, shopId: shop?.id ?? null };
}

export async function GET(_req: NextRequest) {
  const { user, shopId } = await getShop();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!shopId) return Response.json({ error: "No shop assigned" }, { status: 404 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pricing")
    .select("*")
    .eq("shop_id", shopId)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ pricing: data });
}

interface PricingBody {
  bw_page_paise?: number;
  color_page_paise?: number;
  duplex_factor?: number;      // e.g. 0.9 = 10% discount for duplex
  a3_multiplier?: number;
  min_charge_paise?: number;
}

export async function PUT(req: NextRequest) {
  const { user, shopId } = await getShop();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!shopId) return Response.json({ error: "No shop assigned" }, { status: 404 });

  const body = (await req.json()) as PricingBody;
  const patch: Record<string, unknown> = {};

  if (body.bw_page_paise !== undefined) {
    if (!Number.isFinite(body.bw_page_paise) || body.bw_page_paise < 0) {
      return Response.json({ error: "bw_page_paise must be >= 0" }, { status: 400 });
    }
    patch.bw_page_paise = Math.floor(body.bw_page_paise);
  }
  if (body.color_page_paise !== undefined) {
    if (!Number.isFinite(body.color_page_paise) || body.color_page_paise < 0) {
      return Response.json({ error: "color_page_paise must be >= 0" }, { status: 400 });
    }
    patch.color_page_paise = Math.floor(body.color_page_paise);
  }
  if (body.duplex_factor !== undefined) {
    if (!Number.isFinite(body.duplex_factor) || body.duplex_factor < 0.1 || body.duplex_factor > 2) {
      return Response.json({ error: "duplex_factor must be between 0.1 and 2" }, { status: 400 });
    }
    patch.duplex_factor = body.duplex_factor;
  }
  if (body.a3_multiplier !== undefined) {
    if (!Number.isFinite(body.a3_multiplier) || body.a3_multiplier < 1 || body.a3_multiplier > 10) {
      return Response.json({ error: "a3_multiplier must be between 1 and 10" }, { status: 400 });
    }
    patch.a3_multiplier = body.a3_multiplier;
  }
  if (body.min_charge_paise !== undefined) {
    if (!Number.isFinite(body.min_charge_paise) || body.min_charge_paise < 0) {
      return Response.json({ error: "min_charge_paise must be >= 0" }, { status: 400 });
    }
    patch.min_charge_paise = Math.floor(body.min_charge_paise);
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pricing")
    .update(patch)
    .eq("shop_id", shopId)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ pricing: data });
}
