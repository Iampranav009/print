// GET  /api/vendor/me  — returns the signed-in user's vendor profile, the
//                        shop they own, and their bank details in one call.
//                        Returns { onboarded: false, ... } when the user has
//                        no vendor profile yet (needs to onboard) or hasn't
//                        claimed a shop.
// PUT  /api/vendor/me  — upserts the vendor profile from the body.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

interface VendorProfileBody {
  full_name?: string;
  phone?: string;
  address?: string;
}

export async function GET(_req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();

  const [{ data: profile }, { data: shop }] = await Promise.all([
    supabase.from("vendor_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("shops")
      .select(
        "id, name, location, latitude, longitude, google_place_id, contact_email, contact_phone, status, virtual_mode"
      )
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);

  const bank = shop
    ? (await supabase
        .from("vendor_bank_details")
        .select("*")
        .eq("shop_id", shop.id)
        .maybeSingle()).data
    : null;

  return Response.json({
    onboarded: !!profile,
    hasShop: !!shop,
    user: { id: user.id, email: user.email, name: user.user_metadata?.full_name ?? null, avatar_url: user.user_metadata?.avatar_url ?? null },
    profile,
    shop,
    bank,
  });
}

export async function PUT(req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as VendorProfileBody;
  if (!body.full_name?.trim() || !body.phone?.trim()) {
    return Response.json({ error: "full_name and phone are required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("vendor_profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: body.full_name.trim(),
        phone: body.phone.trim(),
        address: body.address?.trim() ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ profile: data });
}
