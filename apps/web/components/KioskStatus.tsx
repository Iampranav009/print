"use client";

import React from "react";
import {
  Clock,
  Loader2,
  Printer,
  CheckCircle2,
  CreditCard,
  XCircle,
  FileCheck2,
} from "lucide-react";
import { StatusPill, type JobStatus } from "./StatusPill";
import { DocumentUploadIcon } from "./DocumentUploadIcon";
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
  /** Full-screen mode: bigger icons + type, centered layout, no side padding.
   * The kiosk switches to this the moment any activity starts. */
  centered?: boolean;
  /** Seconds remaining before auto-return to idle. Only set after a
   * successful print — nulls the countdown UI otherwise. */
  returnCountdown?: number | null;
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
  centered,
  children,
}: {
  tone: "neutral" | "info" | "success" | "warn" | "danger";
  icon: React.ReactNode;
  headline: string;
  sub?: string;
  centered?: boolean;
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

  if (centered) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
        <div
          className={`w-40 h-40 rounded-[2rem] flex items-center justify-center mb-8 ring-2 ${iconRing} [&>svg]:w-20 [&>svg]:h-20`}
        >
          {icon}
        </div>
        <h2 className={`text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05] ${headlineColor}`}>
          {headline}
        </h2>
        {sub && (
          <p className="text-xl lg:text-2xl text-zinc-500 mt-5 max-w-2xl leading-relaxed">
            {sub}
          </p>
        )}
        {children}
      </div>
    );
  }

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

export function KioskStatus({
  activeJob,
  recentJobs,
  liveActivity,
  centered,
  returnCountdown,
}: KioskStatusProps) {
  // ── Live upload / checkout (before the DB job exists or catches up) ──────
  if (liveActivity?.kind === "uploading") {
    return (
      <div className="flex flex-col h-full w-full">
        <div
          className={`flex-1 flex flex-col ${
            centered ? "items-center text-center" : "items-start"
          } justify-center px-6 lg:px-12 py-10`}
        >
          {/* Same document icon the mobile app uses — kept identical here
              so the kiosk feels like the same product. */}
          <div className="mb-8">
            <DocumentUploadIcon size={centered ? "lg" : "md"} />
          </div>
          <h2
            className={`${
              centered ? "text-5xl lg:text-7xl" : "text-4xl lg:text-5xl"
            } font-bold tracking-tight leading-tight text-zinc-900`}
          >
            Uploading your file…
          </h2>
          <p
            className={`${
              centered ? "text-xl lg:text-2xl" : "text-lg lg:text-xl"
            } text-zinc-500 mt-3 max-w-2xl leading-relaxed`}
          >
            {liveActivity.fileCount > 1
              ? `Sending ${liveActivity.fileCount} files from your phone`
              : "Sending from your phone"}
          </p>

          <div className={`mt-8 w-full ${centered ? "max-w-xl" : "max-w-lg"}`}>
            <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-200"
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
        </div>

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
          centered={centered}
        >
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-5xl font-bold tabular-nums text-zinc-900">
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
          centered={centered}
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

  const isPrinted = activeJob.status === "printed";
  const showCountdown =
    isPrinted && typeof returnCountdown === "number" && returnCountdown > 0;

  return (
    <div className="flex flex-col h-full w-full">
      <HeroFrame tone={tone} icon={iconNode} headline={headline} sub={sub} centered={centered}>
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

        {showCountdown && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold ${
              centered ? "text-lg" : "text-sm"
            }`}
          >
            {/* Ring progress + big number */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="absolute inset-0 -rotate-90">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.2"
                  strokeWidth="3"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 14}
                  strokeDashoffset={
                    2 * Math.PI * 14 * (1 - (returnCountdown as number) / 5)
                  }
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span className="text-sm font-bold tabular-nums">
                {returnCountdown}
              </span>
            </div>
            <span>
              Returning to home in {returnCountdown}s
            </span>
          </div>
        )}
      </HeroFrame>
      <div className="px-6 lg:px-12 pb-8">
        <RecentStrip recentJobs={recentJobs} />
      </div>
    </div>
  );
}
