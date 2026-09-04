"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, TrendingUp, Store, Printer, Wallet, Palette, Circle } from "lucide-react";

interface Summary {
  total_shops: number;
  active_shops: number;
  total_prints: number;
  color_prints: number;
  bw_prints: number;
  gross_revenue_paise: number;
  color_revenue_paise: number;
  bw_revenue_paise: number;
  platform_fee_paise: number;
  net_vendor_earnings_paise: number;
  pending_payout_paise: number;
  paid_out_paise: number;
  total_jobs: number;
}

interface ShopRow {
  shop_id: string;
  shop_name: string;
  location: string | null;
  prints: number;
  color_prints: number;
  bw_prints: number;
  revenue_paise: number;
  net_earnings_paise: number;
  platform_fee_paise: number;
}

interface AnalyticsData {
  platform_fee_bps: number;
  summary: Summary;
  by_shop: ShopRow[];
}

function formatPaise(p: number): string {
  return `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "zinc",
  subline,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "zinc" | "indigo" | "emerald" | "amber" | "blue";
  subline?: string;
}) {
  const bg = {
    zinc: "bg-zinc-50 text-zinc-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  }[tone];
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 tabular-nums truncate">{value}</p>
          {subline && <p className="mt-1 text-xs text-zinc-400">{subline}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }
  if (!data) return <p className="text-sm text-zinc-500">Failed to load analytics.</p>;

  const s = data.summary;
  const feePct = (data.platform_fee_bps / 100).toFixed(2);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Platform analytics</h2>
        <p className="text-sm text-zinc-500 mt-1">Every shop, aggregated.</p>
      </div>

      {/* Top-level tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total prints"
          value={s.total_prints.toLocaleString("en-IN")}
          subline={`${s.total_jobs.toLocaleString("en-IN")} jobs`}
          icon={Printer}
          tone="indigo"
        />
        <StatCard
          label="Gross revenue"
          value={formatPaise(s.gross_revenue_paise)}
          subline="All-time collected"
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label={`Platform fee (${feePct}%)`}
          value={formatPaise(s.platform_fee_paise)}
          subline="Razorpay share"
          icon={Wallet}
          tone="amber"
        />
        <StatCard
          label="Shops"
          value={s.total_shops.toString()}
          subline={`${s.active_shops} active`}
          icon={Store}
          tone="blue"
        />
      </div>

      {/* Revenue split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5">
          <p className="text-sm font-medium text-zinc-500">Colour vs B&amp;W prints</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-bold tabular-nums text-emerald-600">
              {s.color_prints.toLocaleString("en-IN")}
            </span>
            <span className="text-lg text-zinc-300 mb-0.5">/</span>
            <span className="text-2xl font-bold tabular-nums text-zinc-500">
              {s.bw_prints.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-3 flex gap-0.5 h-2 rounded-full overflow-hidden bg-zinc-100">
            {s.total_prints > 0 && (
              <>
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${(s.color_prints / s.total_prints) * 100}%` }}
                />
                <div
                  className="bg-zinc-400 h-full"
                  style={{ width: `${(s.bw_prints / s.total_prints) * 100}%` }}
                />
              </>
            )}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Palette className="w-3 h-3 text-emerald-500" />
              Colour: {formatPaise(s.color_revenue_paise)}
            </span>
            <span className="flex items-center gap-1.5">
              <Circle className="w-3 h-3 text-zinc-400" />
              B&amp;W: {formatPaise(s.bw_revenue_paise)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5">
          <p className="text-sm font-medium text-zinc-500">Owed to vendors (net)</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 tabular-nums">
            {formatPaise(s.net_vendor_earnings_paise)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Gross revenue minus {feePct}% fee</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5">
          <p className="text-sm font-medium text-zinc-500">Payouts</p>
          <p className="mt-1 text-lg font-bold text-amber-600 tabular-nums">
            {formatPaise(s.pending_payout_paise)}
          </p>
          <p className="text-xs text-zinc-500">pending or approved</p>
          <p className="mt-2 text-lg font-bold text-emerald-600 tabular-nums">
            {formatPaise(s.paid_out_paise)}
          </p>
          <p className="text-xs text-zinc-500">already paid out</p>
        </div>
      </div>

      {/* By-shop breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">Analytics by vendor</h3>
          <span className="text-xs text-zinc-400">{data.by_shop.length} with activity</span>
        </div>
        {data.by_shop.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-400 text-center">No shop activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-zinc-100">
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Shop</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide text-right">
                    Prints
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide text-right">
                    Colour
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide text-right">
                    B&amp;W
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide text-right">
                    Gross
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide text-right">
                    Fee ({feePct}%)
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide text-right">
                    Vendor net
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.by_shop.map((row) => (
                  <tr key={row.shop_id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-zinc-900">{row.shop_name}</p>
                      {row.location && <p className="text-xs text-zinc-400 truncate max-w-[240px]">{row.location}</p>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-900">{row.prints}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{row.color_prints}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-500">{row.bw_prints}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-900 font-medium">
                      {formatPaise(row.revenue_paise)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-600">
                      {formatPaise(row.platform_fee_paise)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-emerald-700 font-semibold">
                      {formatPaise(row.net_earnings_paise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
