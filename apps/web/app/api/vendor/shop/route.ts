// PUT /api/vendor/shop — update the vendor's shop: display name, location
// string, and printer coordinates. Only fields sent in the body are touched.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

interface Body {
  name?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export async function PUT(req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!shop) {
    return Response.json({ error: "No shop assigned to this account" }, { status: 404 });
  }

  const body = (await req.json()) as Body;
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.location !== undefined) patch.location = body.location?.trim() ?? null;
  if (body.latitude !== undefined) patch.latitude = body.latitude;
  if (body.longitude !== undefined) patch.longitude = body.longitude;
  if (body.google_place_id !== undefined) patch.google_place_id = body.google_place_id;
  if (body.contact_email !== undefined) patch.contact_email = body.contact_email;
  if (body.contact_phone !== undefined) patch.contact_phone = body.contact_phone;

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shops")
    .update(patch)
    .eq("id", shop.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ shop: data });
}
