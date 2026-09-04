// GET /api/admin/analytics — platform-wide numbers across every shop.
//
// Returns totals for prints (color / B&W), gross revenue collected, the 2%
// Razorpay platform share, net owed to vendors, and a per-shop breakdown so
// the admin can spot outliers.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

const PLATFORM_FEE_BPS = 200; // 2%

const PAID_STATUSES = [
  "paid",
  "dispatched",
  "printing",
  "awaiting_release",
  "released",
  "printed",
];

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

  const [{ data: shops }, { data: jobs }, { data: payouts }] = await Promise.all([
    supabase.from("shops").select("id, name, location, status, created_at"),
    supabase
      .from("print_jobs")
      .select("shop_id, price_paise, pages, copies, color, status, created_at")
      .in("status", PAID_STATUSES),
    supabase
      .from("payout_requests")
      .select("shop_id, status, net_payout_paise, amount_paise"),
  ]);

  const summary = {
    total_shops: (shops ?? []).length,
    active_shops: (shops ?? []).filter((s) => s.status === "active").length,
    total_prints: 0,
    color_prints: 0,
    bw_prints: 0,
    gross_revenue_paise: 0,
    color_revenue_paise: 0,
    bw_revenue_paise: 0,
    platform_fee_paise: 0,
    net_vendor_earnings_paise: 0,
    pending_payout_paise: 0,
    paid_out_paise: 0,
    total_jobs: (jobs ?? []).length,
  };

  const perShop = new Map<string, {
    shop_id: string;
    shop_name: string;
    location: string | null;
    prints: number;
    color_prints: number;
    bw_prints: number;
    revenue_paise: number;
    net_earnings_paise: number;
    platform_fee_paise: number;
  }>();

  const shopMap = new Map((shops ?? []).map((s) => [s.id, s]));

  for (const j of jobs ?? []) {
    const sheets = (j.pages as number) * (j.copies as number);
    summary.total_prints += sheets;
    summary.gross_revenue_paise += j.price_paise as number;
    if (j.color) {
      summary.color_prints += sheets;
      summary.color_revenue_paise += j.price_paise as number;
    } else {
      summary.bw_prints += sheets;
      summary.bw_revenue_paise += j.price_paise as number;
    }

    const shopId = j.shop_id as string;
    const shop = shopMap.get(shopId);
    const bucket = perShop.get(shopId) ?? {
      shop_id: shopId,
      shop_name: shop?.name ?? "(unknown)",
      location: shop?.location ?? null,
      prints: 0,
      color_prints: 0,
      bw_prints: 0,
      revenue_paise: 0,
      net_earnings_paise: 0,
      platform_fee_paise: 0,
    };
    bucket.prints += sheets;
    bucket.revenue_paise += j.price_paise as number;
    if (j.color) bucket.color_prints += sheets;
    else bucket.bw_prints += sheets;
    perShop.set(shopId, bucket);
  }

  summary.platform_fee_paise = Math.floor((summary.gross_revenue_paise * PLATFORM_FEE_BPS) / 10_000);
  summary.net_vendor_earnings_paise = summary.gross_revenue_paise - summary.platform_fee_paise;

  for (const bucket of perShop.values()) {
    bucket.platform_fee_paise = Math.floor((bucket.revenue_paise * PLATFORM_FEE_BPS) / 10_000);
    bucket.net_earnings_paise = bucket.revenue_paise - bucket.platform_fee_paise;
  }

  for (const p of payouts ?? []) {
    if (p.status === "pending" || p.status === "approved") {
      summary.pending_payout_paise += p.net_payout_paise as number;
    } else if (p.status === "paid") {
      summary.paid_out_paise += p.net_payout_paise as number;
    }
  }

  const byShop = Array.from(perShop.values()).sort((a, b) => b.revenue_paise - a.revenue_paise);

  return Response.json({
    platform_fee_bps: PLATFORM_FEE_BPS,
    summary,
    by_shop: byShop,
  });
}
