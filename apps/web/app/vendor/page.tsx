"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, ExternalLink, AlertCircle, Printer } from "lucide-react";
import { StatTile } from "@/components/vendor/StatTile";
import { StatusPill } from "@/components/StatusPill";
import type { JobStatus } from "@/components/StatusPill";
import { createClient } from "@/lib/supabase/client";

type AnalyticsResponse = {
  period: "day" | "week" | "month";
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

type VendorMeResponse = {
  onboarded: boolean;
  hasShop: boolean;
  user: { id: string; email: string | null; name: string | null; avatar_url: string | null };
  profile: { user_id: string; full_name: string; phone: string; address: string | null; created_at: string; updated_at: string } | null;
  shop: { id: string; name: string; location: string | null; latitude: number | null; longitude: number | null; google_place_id: string | null; contact_email: string | null; contact_phone: string | null; status: string; virtual_mode: boolean } | null;
  bank: { shop_id: string; account_holder_name: string; account_number: string; ifsc_code: string; bank_name: string | null; branch: string | null; upi_id: string | null; verified: boolean; created_at: string; updated_at: string } | null;
};

function formatPaise(paise: number): string {
  return `\u20b9${(paise / 100).toFixed(2)}`;
}

export default function VendorOverviewPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [vendorData, setVendorData] = useState<VendorMeResponse | null>(null);
  const [liveJobs, setLiveJobs] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [releasingJobId, setReleasingJobId] = useState<string | null>(null);
  const qrRef = useRef<SVGSVGElement>(null);

  const handleReleaseJob = async (jobId: string) => {
    setReleasingJobId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/release`, { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      // ignore
    } finally {
      setReleasingJobId(null);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, meRes] = await Promise.all([
        fetch("/api/vendor/analytics?period=day"),
        fetch("/api/vendor/me"),
      ]);
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (meRes.ok) setVendorData(await meRes.json());
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const shopId = vendorData?.shop?.id ?? "";

  // Supabase Realtime subscription on print_jobs filtered by shop_id
  useEffect(() => {
    if (!shopId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`vendor-overview-jobs-${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "print_jobs",
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, fetchData]);

  // Count active jobs in status dispatched | printing | awaiting_release
  useEffect(() => {
    const active =
      analytics?.recent?.filter((j) =>
        ["dispatched", "printing", "awaiting_release"].includes(j.status)
      ).length ?? 0;
    setLiveJobs(active);
  }, [analytics]);

  const downloadQR = () => {
    const svg = qrRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `printbuddy-qr-${vendorData?.shop?.id ?? "shop"}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const qrUrl = shopId ? `${origin}/s/${shopId}` : "";

  const summary = analytics?.summary;
  const series = analytics?.series ?? [];
  const recent = analytics?.recent ?? [];

  const todayPrints = series[series.length - 1]?.prints ?? 0;
  const yesterdayPrints = series[series.length - 2]?.prints ?? 0;
  const printsTrend =
    yesterdayPrints > 0
      ? ((todayPrints - yesterdayPrints) / yesterdayPrints) * 100
      : undefined;

  const todayRevenue = series[series.length - 1]?.revenue_paise ?? 0;
  const yesterdayRevenue = series[series.length - 2]?.revenue_paise ?? 0;
  const revenueTrend =
    yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : undefined;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 h-28" />
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 h-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 h-64" />
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Prints today"
          value={(summary?.total_prints ?? 0).toString()}
          trend={printsTrend}
        />
        <StatTile
          label="Revenue today"
          value={formatPaise(summary?.total_revenue_paise ?? 0)}
          trend={revenueTrend}
        />

        {/* Colour vs B&W — emerald for colour, zinc for B&W */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-500 leading-none">Colour vs B&amp;W</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-2xl font-bold tabular-nums text-emerald-600">
              {summary?.color_prints ?? 0}
            </span>
            <span className="text-lg font-semibold text-zinc-300 mb-0.5">/</span>
            <span className="text-2xl font-bold tabular-nums text-zinc-400">
              {summary?.bw_prints ?? 0}
            </span>
          </div>
          <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-zinc-100">
            {(summary?.total_prints ?? 0) > 0 && (
              <>
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${((summary?.color_prints ?? 0) / (summary?.total_prints ?? 1)) * 100}%` }}
                  aria-label={`${summary?.color_prints} colour prints`}
                />
                <div
                  className="bg-zinc-400 h-full"
                  style={{ width: `${((summary?.bw_prints ?? 0) / (summary?.total_prints ?? 1)) * 100}%` }}
                  aria-label={`${summary?.bw_prints} B&W prints`}
                />
              </>
            )}
          </div>
        </div>

        <StatTile
          label="Live jobs"
          value={liveJobs.toString()}
          subline="dispatched · printing · ready"
        />
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-lg font-semibold text-zinc-900">Recent jobs</h2>
        </div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-14 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center">
              <Printer className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600">No prints yet</p>
              <p className="text-xs text-zinc-400 mt-1">Share your QR code to get started</p>
            </div>
            {qrUrl && (
              <a
                href={`/kiosk/${shopId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-300 px-3 py-1.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-label="Open kiosk QR view in new tab"
              >
                <ExternalLink className="w-4 h-4" />
                View QR
              </a>
            )}
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
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Action</th>
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((job) => (
                  <tr key={job.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="truncate block max-w-[200px] text-zinc-900 font-medium" title={job.file_name}>
                        {job.file_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 tabular-nums">
                      {job.pages}&times;{job.copies}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        job.color ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {job.color ? "Colour" : "B&W"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-900 tabular-nums">{formatPaise(job.price_paise)}</td>
                    <td className="px-4 py-3"><StatusPill status={job.status as JobStatus} /></td>
                    <td className="px-4 py-3">
                      {job.status === "awaiting_release" && (
                        <button
                          onClick={() => handleReleaseJob(job.id)}
                          disabled={releasingJobId === job.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{releasingJobId === job.id ? "Releasing..." : "Release"}</span>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-3 text-zinc-400 text-xs">
                      {new Date(job.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-zinc-900">Your QR code</h2>
          {qrUrl ? (
            <>
              <div className="flex justify-center p-4 bg-zinc-50 rounded-xl">
                <QRCodeSVG
                  ref={qrRef as React.Ref<SVGSVGElement>}
                  value={qrUrl}
                  size={200}
                  level="M"
                  aria-label={`QR code for ${qrUrl}`}
                />
              </div>
              <p className="text-xs text-zinc-400 text-center truncate">{qrUrl}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label="Download QR code as PNG"
                >
                  <Download className="w-4 h-4" />
                  Download PNG
                </button>
                <a
                  href={`/kiosk/${shopId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 hover:border-indigo-300 text-sm font-medium text-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label="Open kiosk view in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open kiosk view
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-400">Shop not set up yet.</p>
          )}
        </div>

        {/* Bank status card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-zinc-900">Bank status</h2>
          {vendorData?.bank ? (
            <>
              <div className="flex items-center gap-2">
                {vendorData.bank.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
                    Pending verification
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500">
                {vendorData.bank.bank_name ? `${vendorData.bank.bank_name} · ` : ""}
                Account ending {vendorData.bank.account_number.slice(-4)}
              </p>
              {!vendorData.bank.verified && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                  Our team will verify your details within 24 hours before enabling payouts.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Add bank details to receive payouts.
                </p>
              </div>
              <a
                href="/vendor/bank"
                className="inline-flex w-fit items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Add bank details
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
