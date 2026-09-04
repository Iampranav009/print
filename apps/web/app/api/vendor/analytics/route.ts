// GET /api/vendor/analytics?period=day|week|month — aggregated stats for
// the signed-in vendor's shop. Only counts jobs that reached at least
// "paid" (so unpaid/priced attempts don't inflate numbers).
//
// Returns:
//   summary:  { total_prints, total_revenue_paise, color_prints, bw_prints,
//               color_revenue_paise, bw_revenue_paise }
//   series:   [{ bucket, prints, revenue_paise, color_prints, bw_prints }, ...]
//   recent:   last 10 jobs in the window

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

type Period = "day" | "week" | "month";

interface JobRow {
  id: string;
  created_at: string;
  status: string;
  price_paise: number;
  pages: number;
  copies: number;
  color: boolean;
  paper: string;
  file_path: string | null;
}

const PAID_STATUSES = [
  "paid",
  "dispatched",
  "printing",
  "awaiting_release",
  "released",
  "printed",
];

function windowStart(period: Period): Date {
  const now = new Date();
  const d = new Date(now);
  if (period === "day") {
    d.setDate(now.getDate() - 30);           // 30 daily buckets
  } else if (period === "week") {
    d.setDate(now.getDate() - 7 * 12);       // 12 weekly buckets
  } else {
    d.setMonth(now.getMonth() - 12);         // 12 monthly buckets
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function bucketKey(period: Period, iso: string): string {
  const d = new Date(iso);
  if (period === "day") {
    return d.toISOString().slice(0, 10);                // YYYY-MM-DD
  }
  if (period === "week") {
    // ISO week key: year + ISO week number
    const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }
  return d.toISOString().slice(0, 7);                    // YYYY-MM
}

export async function GET(req: NextRequest) {
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

  const period = (req.nextUrl.searchParams.get("period") as Period) || "day";
  if (!["day", "week", "month"].includes(period)) {
    return Response.json({ error: "Invalid period" }, { status: 400 });
  }

  const since = windowStart(period).toISOString();

  const { data: rows, error } = await supabase
    .from("print_jobs")
    .select("id, created_at, status, price_paise, pages, copies, color, paper, file_path")
    .eq("shop_id", shop.id)
    .in("status", PAID_STATUSES)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const jobs = (rows ?? []) as JobRow[];

  const summary = {
    total_prints: 0,
    total_revenue_paise: 0,
    color_prints: 0,
    bw_prints: 0,
    color_revenue_paise: 0,
    bw_revenue_paise: 0,
    total_jobs: jobs.length,
  };

  const bucketMap = new Map<
    string,
    { bucket: string; prints: number; revenue_paise: number; color_prints: number; bw_prints: number }
  >();

  for (const j of jobs) {
    const sheets = j.pages * j.copies;
    summary.total_prints += sheets;
    summary.total_revenue_paise += j.price_paise;
    if (j.color) {
      summary.color_prints += sheets;
      summary.color_revenue_paise += j.price_paise;
    } else {
      summary.bw_prints += sheets;
      summary.bw_revenue_paise += j.price_paise;
    }

    const key = bucketKey(period, j.created_at);
    const b = bucketMap.get(key) ?? {
      bucket: key,
      prints: 0,
      revenue_paise: 0,
      color_prints: 0,
      bw_prints: 0,
    };
    b.prints += sheets;
    b.revenue_paise += j.price_paise;
    if (j.color) b.color_prints += sheets;
    else b.bw_prints += sheets;
    bucketMap.set(key, b);
  }

  const series = Array.from(bucketMap.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));

  const recent = jobs.slice(0, 10).map((j) => ({
    id: j.id,
    created_at: j.created_at,
    status: j.status,
    price_paise: j.price_paise,
    pages: j.pages,
    copies: j.copies,
    color: j.color,
    paper: j.paper,
    file_name: j.file_path?.split("/").pop() ?? "document",
  }));

  return Response.json({ period, since, summary, series, recent });
}
