// Admin: list and create vendor invite tokens.
// The response of POST includes the full claim URL so the admin can copy
// and send it to the vendor over email/WhatsApp/whatever.

import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

async function requireAdmin() {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return { user: null, error: "Unauthorized" as const, status: 401 };
  if (!isAdmin(user)) return { user, error: "Forbidden" as const, status: 403 };
  return { user, error: null, status: 200 };
}

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const supabase = getSupabase();
  const shopIdFilter = req.nextUrl.searchParams.get("shopId");

  let query = supabase
    .from("vendor_invites")
    .select("token, shop_id, email, claimed_by, claimed_at, expires_at, created_at")
    .order("created_at", { ascending: false });

  if (shopIdFilter) query = query.eq("shop_id", shopIdFilter);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ invites: data ?? [] });
}

interface CreateBody {
  shop_id: string;
  email?: string;
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as CreateBody;
  if (!body.shop_id) {
    return Response.json({ error: "shop_id is required" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, owner_id")
    .eq("id", body.shop_id)
    .maybeSingle();
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });
  if (shop.owner_id) {
    return Response.json({ error: "Shop already has an owner" }, { status: 409 });
  }

  const token = generateToken();
  const { data: invite, error } = await supabase
    .from("vendor_invites")
    .insert({ token, shop_id: body.shop_id, email: body.email?.trim().toLowerCase() ?? null })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const origin = req.nextUrl.origin;
  const claimUrl = `${origin}/vendor/claim?token=${encodeURIComponent(token)}`;

  return Response.json({ invite, claimUrl });
}
