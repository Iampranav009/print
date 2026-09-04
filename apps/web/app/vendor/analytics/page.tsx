"use client";

import { useState, useEffect, useCallback } from "react";
import { SegmentedControl } from "@/components/vendor/SegmentedControl";
import { StatTile } from "@/components/vendor/StatTile";
import { SimpleBarChart } from "@/components/vendor/SimpleBarChart";
import { StatusPill } from "@/components/StatusPill";
import type { JobStatus } from "@/components/StatusPill";

type Period = "day" | "week" | "month";

type AnalyticsResponse = {
  period: Period;
  since: string;
  summary: {
    total_prints: number;
    total_revenue_paise: number;
    color_prints: number;
    bw_prints: number;
    color_revenue_paise: number;
    bw_revenue_paise: number;
    total_jobs: number;
  };
  series: Array<{
    bucket: string;
    prints: number;
    revenue_paise: number;
    color_prints: number;
    bw_prints: number;
  }>;
  recent: Array<{
    id: string;
    created_at: string;
    status: string;
    price_paise: number;
    pages: number;
    copies: number;
    color: boolean;
    paper: string;
    file_name: string;
  }>;
};

function formatPaise(paise: number): string {
  return `\u20b9${(paise / 100).toFixed(2)}`;
}

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

function SkeletonTile() {
  return <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 h-24 animate-pulse" />;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("day");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<"prints" | "revenue">("prints");

  const fetchAnalytics = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendor/analytics?period=${p}`);
      if (res.ok) setData(await res.json());
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [fetchAnalytics, period]);

  const s = data?.summary;
  const series = data?.series ?? [];
  const recent = data?.recent ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-zinc-900">Analytics</h2>
        <SegmentedControl
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(p) => setPeriod(p)}
          ariaLabel="Time period"
        />
      </div>

      {/* Summary tiles */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonTile key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatTile label="Total prints" value={(s?.total_prints ?? 0).toString()} />
          <StatTile label="Total revenue" value={formatPaise(s?.total_revenue_paise ?? 0)} />
          <StatTile label="Colour prints" value={(s?.color_prints ?? 0).toString()} />
          <StatTile label="B&W prints" value={(s?.bw_prints ?? 0).toString()} />
          <StatTile label="Colour revenue" value={formatPaise(s?.color_revenue_paise ?? 0)} />
          <StatTile label="B&W revenue" value={formatPaise(s?.bw_revenue_paise ?? 0)} />
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 h-72 animate-pulse" />
      ) : series.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-10 text-center">
          <p className="text-sm text-zinc-400">No paid prints in this window yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-sm font-semibold text-zinc-700">
              {chartMode === "prints" ? "Prints" : "Revenue"} over time
            </h3>
            <SegmentedControl
              options={[
                { label: "Prints", value: "prints" },
                { label: "Revenue", value: "revenue" },
              ]}
              value={chartMode}
              onChange={setChartMode}
              ariaLabel="Chart data mode"
            />
          </div>
          <SimpleBarChart data={series} mode={chartMode} height={240} />
        </div>
      )}

      {/* Recent jobs table */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-700">Recent jobs</h3>
        </div>
        {loading ? (
          <div className="px-6 py-8 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-zinc-100 rounded-lg" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-zinc-400">No paid prints in this window yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-zinc-100">
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">File</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Pages</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((job) => (
                  <tr key={job.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="truncate block max-w-[180px] text-zinc-900 font-medium" title={job.file_name}>
                        {job.file_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 tabular-nums">{job.pages}&times;{job.copies}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        job.color ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {job.color ? "Colour" : "B&W"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-900 tabular-nums">{formatPaise(job.price_paise)}</td>
                    <td className="px-4 py-3"><StatusPill status={job.status as JobStatus} /></td>
                    <td className="px-6 py-3 text-zinc-400 text-xs">
                      {new Date(job.created_at).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
