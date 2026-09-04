// Admin bank verification.
//
// GET   /api/admin/vendors/bank                     — list every vendor bank record with review-relevant metadata
// GET   /api/admin/vendors/bank?shopId=…            — one shop's full bank record (unmasked)
// PATCH /api/admin/vendors/bank { shop_id, verified }
//        — flip the verified flag on the shop's bank record

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

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const supabase = getSupabase();
  const shopId = req.nextUrl.searchParams.get("shopId");

  if (shopId) {
    const { data, error } = await supabase
      .from("vendor_bank_details")
      .select("*")
      .eq("shop_id", shopId)
      .maybeSingle();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ bank: data });
  }

  const { data: banks, error } = await supabase
    .from("vendor_bank_details")
    .select("shop_id, account_holder_name, account_number, ifsc_code, bank_name, branch, upi_id, verified, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const shopIds = (banks ?? []).map((b) => b.shop_id as string);
  const { data: shops } = shopIds.length
    ? await supabase.from("shops").select("id, name, location, owner_id").in("id", shopIds)
    : { data: [] as { id: string; name: string; location: string | null; owner_id: string | null }[] };

  const ownerIds = Array.from(new Set((shops ?? []).map((s) => s.owner_id).filter(Boolean) as string[]));
  const { data: profiles } = ownerIds.length
    ? await supabase.from("vendor_profiles").select("user_id, full_name, phone").in("user_id", ownerIds)
    : { data: [] as { user_id: string; full_name: string; phone: string }[] };

  const shopMap = new Map((shops ?? []).map((s) => [s.id, s]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const rows = (banks ?? []).map((b) => {
    const shop = shopMap.get(b.shop_id as string);
    const profile = shop?.owner_id ? profileMap.get(shop.owner_id) ?? null : null;
    return {
      shop_id: b.shop_id,
      shop_name: shop?.name ?? "(unknown)",
      shop_location: shop?.location ?? null,
      vendor_name: profile?.full_name ?? null,
      vendor_phone: profile?.phone ?? null,
      account_holder_name: b.account_holder_name,
      account_number: b.account_number,
      ifsc_code: b.ifsc_code,
      bank_name: b.bank_name,
      branch: b.branch,
      upi_id: b.upi_id,
      verified: b.verified,
      created_at: b.created_at,
      updated_at: b.updated_at,
    };
  });

  return Response.json({ banks: rows });
}

interface PatchBody {
  shop_id?: string;
  verified?: boolean;
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as PatchBody;
  if (!body.shop_id || typeof body.verified !== "boolean") {
    return Response.json({ error: "shop_id and verified (boolean) are required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("vendor_bank_details")
    .update({ verified: body.verified, updated_at: new Date().toISOString() })
    .eq("shop_id", body.shop_id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ bank: data });
}
