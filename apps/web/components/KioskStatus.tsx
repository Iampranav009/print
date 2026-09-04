"use client";

import React from "react";
import {
  Clock,
  Loader2,
  Printer,
  CheckCircle2,
  Upload,
  CreditCard,
  XCircle,
  FileCheck2,
} from "lucide-react";
import { StatusPill, type JobStatus } from "./StatusPill";
import { formatRelativeTime } from "@/lib/date-utils";

export interface KioskJob {
  id: string;
  shop_id: string;
  shop_name?: string;
  status: JobStatus;
  price_paise?: number;
  release_code: string | null;
  file_name?: string;
  created_at: string;
  updated_at?: string;
}

// A transient client-side event that beats out the DB job for the hero slot.
// Broadcast from the mobile customer's session while they're uploading or
// paying — before the DB has any status yet.
export type KioskLiveActivity =
  | { kind: "uploading"; fileName: string; fileCount: number; percent: number }
  | { kind: "checkout"; fileName: string; amountPaise: number };

interface KioskStatusProps {
  activeJob: KioskJob | null;
  recentJobs: KioskJob[];
  liveActivity?: KioskLiveActivity | null;
}

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2)}`;
}

// ── Small building blocks ────────────────────────────────────────────────────

function HeroFrame({
  tone,
  icon,
  headline,
  sub,
  children,
}: {
  tone: "neutral" | "info" | "success" | "warn" | "danger";
  icon: React.ReactNode;
  headline: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  const iconRing = {
    neutral: "bg-zinc-100 text-zinc-500 ring-zinc-200",
    info: "bg-indigo-50 text-indigo-600 ring-indigo-200",
    success: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    warn: "bg-amber-50 text-amber-600 ring-amber-200",
    danger: "bg-red-50 text-red-600 ring-red-200",
  }[tone];

  const headlineColor = {
    neutral: "text-zinc-900",
    info: "text-zinc-900",
    success: "text-emerald-700",
    warn: "text-amber-800",
    danger: "text-red-700",
  }[tone];

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-8 lg:px-12">
      <div className={`w-28 h-28 rounded-3xl flex items-center justify-center mb-6 ring-1 ${iconRing}`}>
        {icon}
      </div>
      <h2 className={`text-4xl lg:text-5xl font-bold tracking-tight leading-tight ${headlineColor}`}>
        {headline}
      </h2>
      {sub && (
        <p className="text-lg lg:text-xl text-zinc-500 mt-3 max-w-2xl leading-relaxed">
          {sub}
        </p>
      )}
      {children}
    </div>
  );
}

function RecentStrip({ recentJobs }: { recentJobs: KioskJob[] }) {
  if (recentJobs.length === 0) return null;
  return (
    <div className="mt-8 pt-6 border-t border-zinc-100">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Recent Activity
      </p>
      <div className="flex flex-wrap gap-2.5">
        {recentJobs.slice(0, 3).map((j) => (
          <div
            key={j.id}
            className="flex items-center gap-2.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-sm"
          >
            <span className="font-medium text-zinc-700 truncate max-w-[140px]">
              {j.file_name || `Job #${j.id.slice(0, 6)}`}
            </span>
            <StatusPill status={j.status} />
            <span className="text-xs text-zinc-500">
              {formatRelativeTime(j.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function KioskStatus({ activeJob, recentJobs, liveActivity }: KioskStatusProps) {
  // ── Live upload / checkout (before the DB job exists or catches up) ──────
  if (liveActivity?.kind === "uploading") {
    return (
      <div className="flex flex-col h-full w-full">
        <HeroFrame
          tone="info"
          icon={<Upload className="w-14 h-14" />}
          headline="Uploading your file…"
          sub={
            liveActivity.fileCount > 1
              ? `Sending ${liveActivity.fileCount} files from your phone`
              : "Sending from your phone"
          }
        >
          <div className="mt-8 max-w-lg">
            <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-200"
                style={{ width: `${Math.min(100, Math.max(0, liveActivity.percent))}%` }}
              />
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-sm text-zinc-500 truncate mr-4">
                {liveActivity.fileName}
              </span>
              <span className="text-sm font-semibold text-zinc-900 tabular-nums">
                {liveActivity.percent}%
              </span>
            </div>
          </div>
        </HeroFrame>
        <div className="px-6 lg:px-12 pb-8">
          <RecentStrip recentJobs={recentJobs} />
        </div>
      </div>
    );
  }

  if (liveActivity?.kind === "checkout") {
    return (
      <div className="flex flex-col h-full w-full">
        <HeroFrame
          tone="warn"
          icon={<CreditCard className="w-14 h-14" />}
          headline="Waiting for payment…"
          sub="Customer is completing payment on their phone."
        >
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-5xl font-black tabular-nums text-zinc-900">
              {formatPaise(liveActivity.amountPaise)}
            </span>
          </div>
          <p className="text-sm text-zinc-500 truncate mt-3 max-w-lg">
            {liveActivity.fileName}
          </p>
        </HeroFrame>
        <div className="px-6 lg:px-12 pb-8">
          <RecentStrip recentJobs={recentJobs} />
        </div>
      </div>
    );
  }

  // ── Idle ────────────────────────────────────────────────────────────────
  if (!activeJob) {
    return (
      <div className="flex flex-col h-full w-full">
        <HeroFrame
          tone="success"
          icon={<Printer className="w-14 h-14" />}
          headline="Ready when you are"
          sub="Scan the QR to start your print"
        >
          <div className="mt-6 flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">
              Printer Ready
            </span>
          </div>
        </HeroFrame>
        <div className="px-6 lg:px-12 pb-8">
          <RecentStrip recentJobs={recentJobs} />
        </div>
      </div>
    );
  }

  // ── DB-driven states ────────────────────────────────────────────────────
  let tone: "info" | "success" | "warn" | "danger" = "info";
  let iconNode: React.ReactNode = <Loader2 className="w-14 h-14 animate-spin" />;
  let headline = "Processing…";
  let sub: string | undefined = undefined;

  switch (activeJob.status) {
    case "awaiting_payment":
    case "priced":
      tone = "warn";
      iconNode = <Clock className="w-14 h-14" />;
      headline = "Waiting for payment";
      sub = "Complete payment on your phone to start the print.";
      break;

    case "paid":
    case "dispatched":
      tone = "success";
      iconNode = <FileCheck2 className="w-14 h-14" />;
      headline = "Payment successful";
      sub = "Sending your file to the printer…";
      break;

    case "printing":
      tone = "info";
      iconNode = <Printer className="w-14 h-14 animate-pulse" />;
      headline = "Printing now…";
      sub = "Please wait — your pages are on the printer.";
      break;

    case "awaiting_release":
      // Only shown for the classic-flow (real agent) shops. Auto-print
      // virtual shops skip this state entirely.
      tone = "success";
      iconNode = <CheckCircle2 className="w-14 h-14" />;
      headline = "Ready to collect";
      sub = "Take your prints from the tray.";
      break;

    case "printed":
      tone = "success";
      iconNode = <CheckCircle2 className="w-14 h-14" />;
      headline = "Print complete";
      sub = "Enjoy — thanks for using PrintBuddy.";
      break;

    case "payment_failed":
      tone = "danger";
      iconNode = <XCircle className="w-14 h-14" />;
      headline = "Payment rejected";
      sub = "The payment didn't go through. Please try again on your phone.";
      break;

    case "print_failed":
      tone = "danger";
      iconNode = <XCircle className="w-14 h-14" />;
      headline = "Print failed";
      sub = "Something went wrong at the printer. Please contact the shop.";
      break;

    case "refunded":
      tone = "warn";
      iconNode = <XCircle className="w-14 h-14" />;
      headline = "Order refunded";
      sub = "Your payment has been refunded.";
      break;

    case "cancelled":
    case "expired":
      tone = "warn";
      iconNode = <XCircle className="w-14 h-14" />;
      headline = "Order cancelled";
      break;
  }

  return (
    <div className="flex flex-col h-full w-full">
      <HeroFrame tone={tone} icon={iconNode} headline={headline} sub={sub}>
        {activeJob.price_paise !== undefined && (
          <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
            <span className="font-medium text-zinc-700">{formatPaise(activeJob.price_paise)}</span>
            {activeJob.file_name && (
              <>
                <span className="text-zinc-300">·</span>
                <span className="truncate max-w-xs">{activeJob.file_name}</span>
              </>
            )}
          </div>
        )}
      </HeroFrame>
      <div className="px-6 lg:px-12 pb-8">
        <RecentStrip recentJobs={recentJobs} />
      </div>
    </div>
  );
}
