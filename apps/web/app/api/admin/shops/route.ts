// Admin: list all shops with owner info, and create new shops.
// Gated by the ADMIN_EMAILS allowlist.

import { NextRequest } from "next/server";
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

export async function GET(_req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("shops")
    .select("id, name, location, status, virtual_mode, owner_id, created_at")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ shops: data ?? [] });
}

interface CreateBody {
  name: string;
  location?: string;
  virtual_mode?: boolean;
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as CreateBody;
  if (!body.name?.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: shop, error } = await supabase
    .from("shops")
    .insert({
      name: body.name.trim(),
      location: body.location?.trim() ?? null,
      virtual_mode: body.virtual_mode ?? false,
      status: "active",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Seed default pricing so the shop is immediately usable.
  await supabase.from("pricing").insert({ shop_id: shop.id }).select();

  return Response.json({ shop });
}
