// Admin: list and update payout requests across every vendor.
//
// GET   /api/admin/payouts?status=pending|approved|rejected|paid
// PATCH /api/admin/payouts   { id, status, admin_note? }

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
  const statusFilter = req.nextUrl.searchParams.get("status");

  let query = supabase
    .from("payout_requests")
    .select(
      "id, shop_id, requested_by, amount_paise, platform_fee_paise, net_payout_paise, status, note, admin_note, processed_by, processed_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (statusFilter && ["pending", "approved", "rejected", "paid"].includes(statusFilter)) {
    query = query.eq("status", statusFilter);
  }

  const { data: requests, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const shopIds = Array.from(new Set((requests ?? []).map((r) => r.shop_id as string)));
  const [{ data: shops }, { data: banks }] = await Promise.all([
    shopIds.length
      ? supabase
          .from("shops")
          .select("id, name, location, owner_id")
          .in("id", shopIds)
      : Promise.resolve({ data: [] as { id: string; name: string; location: string | null; owner_id: string | null }[] }),
    shopIds.length
      ? supabase
          .from("vendor_bank_details")
          .select("shop_id, account_holder_name, account_number, ifsc_code, bank_name, upi_id, verified")
          .in("shop_id", shopIds)
      : Promise.resolve({ data: [] as { shop_id: string }[] }),
  ]);

  const shopMap = new Map((shops ?? []).map((s) => [s.id, s]));
  const bankMap = new Map((banks ?? []).map((b) => [b.shop_id, b]));

  const enriched = (requests ?? []).map((r) => ({
    ...r,
    shop: shopMap.get(r.shop_id as string) ?? null,
    bank: bankMap.get(r.shop_id as string) ?? null,
  }));

  return Response.json({ requests: enriched });
}

interface PatchBody {
  id?: string;
  status?: "approved" | "rejected" | "paid";
  admin_note?: string;
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as PatchBody;
  if (!body.id || !body.status) {
    return Response.json({ error: "id and status are required" }, { status: 400 });
  }
  if (!["approved", "rejected", "paid"].includes(body.status)) {
    return Response.json({ error: "invalid status" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("payout_requests")
    .update({
      status: body.status,
      admin_note: body.admin_note?.trim() || null,
      processed_by: gate.user!.id,
      processed_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ request: data });
}
