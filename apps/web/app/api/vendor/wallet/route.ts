// GET /api/vendor/wallet — compact wallet summary for the top-nav chip.
// Same math as /api/vendor/payouts but returns only what the wallet UI
// needs, so the header can refresh cheaply on every page.

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

export async function GET(_req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!shop) return Response.json({ error: "No shop assigned" }, { status: 404 });

  const [{ data: jobs }, { data: requests }, { data: bank }] = await Promise.all([
    supabase
      .from("print_jobs")
      .select("price_paise")
      .eq("shop_id", shop.id)
      .in("status", PAID_STATUSES),
    supabase
      .from("payout_requests")
      .select("status, net_payout_paise")
      .eq("shop_id", shop.id),
    supabase
      .from("vendor_bank_details")
      .select("verified")
      .eq("shop_id", shop.id)
      .maybeSingle(),
  ]);

  const gross_revenue_paise = (jobs ?? []).reduce(
    (sum, j) => sum + (j.price_paise as number),
    0
  );
  const platform_fee_paise = Math.floor(
    (gross_revenue_paise * PLATFORM_FEE_BPS) / 10_000
  );
  const lifetime_available_paise = Math.max(
    0,
    gross_revenue_paise - platform_fee_paise
  );

  const withheld_paise = (requests ?? [])
    .filter((r) => ["pending", "approved", "paid"].includes(r.status as string))
    .reduce((sum, r) => sum + (r.net_payout_paise as number), 0);

  const available_paise = Math.max(0, lifetime_available_paise - withheld_paise);

  return Response.json({
    currency: "INR",
    available_paise,
    lifetime_earned_paise: lifetime_available_paise,
    withheld_paise,
    can_withdraw: !!bank?.verified && available_paise > 0,
    bank_verified: !!bank?.verified,
  });
}
