// GET /api/vendor/analytics?period=day|week|month
// Uses Asia/Kolkata calendar windows: today (hourly), this week from Monday
// (daily), or this month (daily).

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
  payment_method: "online" | "cash" | null;
  failure_reason: string | null;
}

const INDIA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const REVENUE_STATUSES = new Set([
  "paid", "dispatched", "printing", "awaiting_release", "released", "printed",
]);
const VENDOR_VISIBLE_STATUSES = [
  ...REVENUE_STATUSES, "payment_failed", "print_failed", "refunded",
];

type Bucket = {
  bucket: string;
  prints: number;
  revenue_paise: number;
  color_prints: number;
  bw_prints: number;
};

function indiaCalendarDate(date: Date): Date {
  return new Date(date.getTime() + INDIA_OFFSET_MS);
}

function toUtcInstant(indiaDate: Date): Date {
  return new Date(indiaDate.getTime() - INDIA_OFFSET_MS);
}

function analyticsWindow(period: Period, now = new Date()) {
  const indiaNow = indiaCalendarDate(now);
  const start = new Date(indiaNow);
  if (period === "day") {
    start.setUTCHours(0, 0, 0, 0);
  } else if (period === "week") {
    const isoDay = start.getUTCDay() || 7;
    start.setUTCDate(start.getUTCDate() - isoDay + 1);
    start.setUTCHours(0, 0, 0, 0);
  } else {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
  }
  return { indiaNow, start, since: toUtcInstant(start).toISOString() };
}

function bucketKey(period: Period, iso: string): string {
  const indiaDate = indiaCalendarDate(new Date(iso));
  return period === "day"
    ? indiaDate.toISOString().slice(0, 13)
    : indiaDate.toISOString().slice(0, 10);
}

function emptySeries(period: Period, start: Date, indiaNow: Date): Bucket[] {
  const result: Bucket[] = [];
  const cursor = new Date(start);
  while (cursor <= indiaNow) {
    result.push({
      bucket: period === "day"
        ? cursor.toISOString().slice(0, 13)
        : cursor.toISOString().slice(0, 10),
      prints: 0,
      revenue_paise: 0,
      color_prints: 0,
      bw_prints: 0,
    });
    if (period === "day") cursor.setUTCHours(cursor.getUTCHours() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export async function GET(req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const periodParam = req.nextUrl.searchParams.get("period") ?? "day";
  if (!(["day", "week", "month"] as string[]).includes(periodParam)) {
    return Response.json({ error: "Invalid period" }, { status: 400 });
  }
  const period = periodParam as Period;
  const supabase = getSupabase();
  const { data: shop, error: shopError } = await supabase
    .from("shops").select("id").eq("owner_id", user.id).maybeSingle();
  if (shopError) return Response.json({ error: "Could not load shop analytics" }, { status: 503 });
  if (!shop) return Response.json({ error: "No shop assigned" }, { status: 404 });

  const now = new Date();
  const { indiaNow, start, since } = analyticsWindow(period, now);
  const { data: rows, error } = await supabase
    .from("print_jobs")
    .select("id, created_at, status, price_paise, pages, copies, color, paper, file_path, payment_method, failure_reason")
    .eq("shop_id", shop.id)
    .in("status", VENDOR_VISIBLE_STATUSES)
    .gte("created_at", since)
    .lte("created_at", now.toISOString())
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: "Could not load shop analytics" }, { status: 503 });
  const jobs = (rows ?? []) as JobRow[];
  const countedJobs = jobs.filter((job) => REVENUE_STATUSES.has(job.status));
  const summary = {
    total_prints: 0,
    total_revenue_paise: 0,
    color_prints: 0,
    bw_prints: 0,
    color_revenue_paise: 0,
    bw_revenue_paise: 0,
    total_jobs: countedJobs.length,
    online_revenue_paise: 0,
    cash_revenue_paise: 0,
    failed_jobs: jobs.filter((job) => job.status === "print_failed").length,
    refunded_jobs: jobs.filter((job) => job.status === "refunded").length,
  };

  const initialSeries = emptySeries(period, start, indiaNow);
  const bucketMap = new Map(initialSeries.map((bucket) => [bucket.bucket, bucket]));
  for (const job of countedJobs) {
    const sheets = job.pages * job.copies;
    summary.total_prints += sheets;
    summary.total_revenue_paise += job.price_paise;
    if (job.color) {
      summary.color_prints += sheets;
      summary.color_revenue_paise += job.price_paise;
    } else {
      summary.bw_prints += sheets;
      summary.bw_revenue_paise += job.price_paise;
    }
    if (job.payment_method === "cash") summary.cash_revenue_paise += job.price_paise;
    else summary.online_revenue_paise += job.price_paise;

    const bucket = bucketMap.get(bucketKey(period, job.created_at));
    if (!bucket) continue;
    bucket.prints += sheets;
    bucket.revenue_paise += job.price_paise;
    if (job.color) bucket.color_prints += sheets;
    else bucket.bw_prints += sheets;
  }

  const recent = jobs.slice(0, 20).map((job) => ({
    id: job.id,
    created_at: job.created_at,
    status: job.status,
    price_paise: job.price_paise,
    pages: job.pages,
    copies: job.copies,
    color: job.color,
    paper: job.paper,
    file_name: job.file_path?.split("/").pop() ?? "document",
    payment_method: job.payment_method ?? "online",
    failure_reason: job.failure_reason,
  }));

  return Response.json({
    period,
    timezone: "Asia/Kolkata",
    since,
    generated_at: now.toISOString(),
    summary,
    series: Array.from(bucketMap.values()),
    recent,
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
