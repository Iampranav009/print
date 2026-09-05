// Admin: list and create vendor invite tokens.
//
// POST accepts two shapes:
//   { shop_id, email? }              — invite for an existing unclaimed shop
//   { new_shop: { name, location? }, email? } — create a fresh shop AND
//                                                the invite in one call
//
// The response includes the full claim URL so the admin can copy and send
// it to the vendor over email / WhatsApp / whatever.

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
  shop_id?: string;
  new_shop?: {
    name: string;
    location?: string;
  };
  email?: string;
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as CreateBody;

  if (!body.shop_id && !body.new_shop?.name?.trim()) {
    return Response.json(
      { error: "Either shop_id or new_shop.name is required" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  let shopId: string;

  if (body.shop_id) {
    // ── Use an existing unclaimed shop ─────────────────────────────────
    const { data: shop } = await supabase
      .from("shops")
      .select("id, owner_id")
      .eq("id", body.shop_id)
      .maybeSingle();
    if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });
    if (shop.owner_id) {
      return Response.json({ error: "Shop already has an owner" }, { status: 409 });
    }
    shopId = shop.id;
  } else {
    // ── Create a fresh shop first, then invite the vendor to claim it ──
    const name = body.new_shop!.name.trim();
    const location = body.new_shop!.location?.trim() || null;

    const { data: created, error: shopErr } = await supabase
      .from("shops")
      .insert({
        name,
        location,
        status: "active",
        virtual_mode: false,
      })
      .select("id")
      .single();

    if (shopErr || !created) {
      return Response.json(
        { error: `Could not create shop: ${shopErr?.message ?? "unknown error"}` },
        { status: 500 }
      );
    }
    shopId = created.id;

    // Seed a default pricing row so the shop is immediately usable once
    // the vendor claims it. If it exists (shouldn't), just ignore.
    await supabase.from("pricing").insert({ shop_id: shopId }).select();
  }

  const token = generateToken();
  const { data: invite, error } = await supabase
    .from("vendor_invites")
    .insert({
      token,
      shop_id: shopId,
      email: body.email?.trim().toLowerCase() || null,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const origin = req.nextUrl.origin;
  const claimUrl = `${origin}/vendor/claim?token=${encodeURIComponent(token)}`;

  return Response.json({ invite, claimUrl, shop_id: shopId });
}
