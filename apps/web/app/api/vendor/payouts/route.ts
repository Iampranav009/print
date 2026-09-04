// GET  /api/vendor/payouts — list payout requests for the signed-in vendor's shop
// POST /api/vendor/payouts — create a new payout request for the shop
//
// A 2% platform fee is applied at request time (Razorpay share on collected
// revenue). The vendor sees both the gross request amount and the net payout.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

const PLATFORM_FEE_BPS = 200; // 2.00%

const PAID_STATUSES = [
  "paid",
  "dispatched",
  "printing",
  "awaiting_release",
  "released",
  "printed",
];

async function getVendorShop() {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return { user: null, shop: null, error: "Unauthorized" as const, status: 401 };

  const supabase = getSupabase();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!shop) return { user, shop: null, error: "No shop" as const, status: 404 };
  return { user, shop, error: null, status: 200 };
}

export async function GET(_req: NextRequest) {
  const gate = await getVendorShop();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const supabase = getSupabase();

  // Compute lifetime gross revenue and already-requested totals so the UI can
  // show the vendor how much is available to withdraw.
  const [{ data: jobs }, { data: requests }, { data: bank }] = await Promise.all([
    supabase
      .from("print_jobs")
      .select("price_paise, status")
      .eq("shop_id", gate.shop!.id)
      .in("status", PAID_STATUSES),
    supabase
      .from("payout_requests")
      .select("*")
      .eq("shop_id", gate.shop!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("vendor_bank_details")
      .select("shop_id, verified")
      .eq("shop_id", gate.shop!.id)
      .maybeSingle(),
  ]);

  const gross_revenue_paise = (jobs ?? []).reduce((sum, j) => sum + (j.price_paise as number), 0);
  const platform_fee_paise = Math.floor((gross_revenue_paise * PLATFORM_FEE_BPS) / 10_000);
  const lifetime_available_paise = Math.max(0, gross_revenue_paise - platform_fee_paise);

  const requested_or_paid_paise = (requests ?? [])
    .filter((r) => ["pending", "approved", "paid"].includes(r.status as string))
    .reduce((sum, r) => sum + (r.net_payout_paise as number), 0);

  const available_paise = Math.max(0, lifetime_available_paise - requested_or_paid_paise);

  return Response.json({
    shop_id: gate.shop!.id,
    platform_fee_bps: PLATFORM_FEE_BPS,
    gross_revenue_paise,
    lifetime_available_paise,
    already_requested_paise: requested_or_paid_paise,
    available_paise,
    has_bank: !!bank,
    bank_verified: bank?.verified ?? false,
    requests: requests ?? [],
  });
}

interface CreateBody {
  amount_paise?: number;
  note?: string;
}

export async function POST(req: NextRequest) {
  const gate = await getVendorShop();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as CreateBody;
  const amount = Number(body.amount_paise);
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "amount_paise must be a positive number" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Re-check bank details exist AND are verified so we don't accept a
  // request we can't fulfil — and don't wire money to an unvetted account.
  const { data: bank } = await supabase
    .from("vendor_bank_details")
    .select("shop_id, verified")
    .eq("shop_id", gate.shop!.id)
    .maybeSingle();
  if (!bank) {
    return Response.json(
      { error: "Add bank details before requesting a payout" },
      { status: 400 }
    );
  }
  if (!bank.verified) {
    return Response.json(
      { error: "Bank details are pending admin verification — payouts unlock once verified" },
      { status: 403 }
    );
  }

  const platform_fee_paise = Math.floor((amount * PLATFORM_FEE_BPS) / 10_000);
  const net_payout_paise = amount - platform_fee_paise;

  const { data, error } = await supabase
    .from("payout_requests")
    .insert({
      shop_id: gate.shop!.id,
      requested_by: gate.user!.id,
      amount_paise: amount,
      platform_fee_paise,
      net_payout_paise,
      note: body.note?.trim() || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ request: data });
}
