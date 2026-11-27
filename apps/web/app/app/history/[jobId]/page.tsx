"use client";

import React, { useState, useEffect, useRef, use, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  WifiOff,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { NavBar } from "@/components/mobile/NavBar";
import { EmptyState } from "@/components/EmptyState";

// ── Types ─────────────────────────────────────────────────────────────────────

type JobStatus =
  | "queued"
  | "downloading"
  | "printing"
  | "awaiting_release"
  | "released"
  | "printed"
  | "done"
  | "payment_pending"
  | "payment_failed"
  | "print_failed"
  | "cancelled"
  | "priced"
  | "awaiting_payment"
  | "paid"
  | "dispatched"
  | "refunded";

interface Job {
  id: string;
  shop_id: string;
  status: JobStatus;
  price_paise: number;
  pages: number;
  copies: number;
  color: boolean;
  paper: string;
  duplex: boolean;
  orientation: string;
  release_code: string | null;
  razorpay_order_id: string | null;
  payment_method: "online" | "cash";
  created_at: string;
  updated_at: string;
  queueAhead: number;
  estimatedWaitMinutes: number;
  refundStatus: string | null;
}

const TERMINAL: JobStatus[] = [
  "done",
  "printed",
  "released",
  "payment_failed",
  "cancelled",
  "refunded",
];
const POLL_INTERVAL = 4000;
const SLOW_THRESHOLD_MS = 3 * 60 * 1000;

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2)}`;
}

function getOnlineStatus() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getStatusConfig(status: JobStatus, paymentMethod: "online" | "cash" = "online") {
  switch (status) {
    case "payment_pending":
    case "awaiting_payment":
      return {
        icon: <Clock className="w-10 h-10 text-amber-500" />,
        headline: paymentMethod === "cash" ? "Waiting for cash confirmation" : "Confirming payment…",
        sub: paymentMethod === "cash" ? "Please pay at the counter. Your print will enter the queue when the shop confirms receipt." : "Waiting for bank confirmation. This usually takes under a minute.",
        color: "amber",
      };
    case "queued":
    case "priced":
    case "paid":
      return {
        icon: <Clock className="w-10 h-10 text-zinc-400" />,
        headline: "Job queued",
        sub: "The printer node will pick this up shortly.",
        color: "zinc",
      };
    case "downloading":
      return {
        icon: <Loader2 className="w-10 h-10 text-tint animate-spin" />,
        headline: "Preparing your file…",
        sub: "Rasterizing and sending document to printer.",
        color: "blue",
      };
    case "dispatched":
    case "awaiting_release":
      return {
        icon: <Clock className="w-10 h-10 text-tint" />,
        headline: "Your print is in line",
        sub: `${paymentMethod === "cash" ? "Cash received" : "Payment confirmed"}. We’ll update you when printing begins.`,
        color: "blue",
      };
    case "printing":
      return {
        icon: <Printer className="w-10 h-10 text-tint animate-pulse" />,
        headline: "Printing now…",
        sub: "Your document is printing automatically. Collect it from the printer tray once done.",
        color: "blue",
      };
    case "released":
    case "printed":
    case "done":
      return {
        icon: (
          <CheckCircle2 className="w-11 h-11 text-white" />
        ),
        headline: "Printed! Collect from tray",
        sub: "Your document has printed. Thank you for using HIMMER!",
        color: "green",
      };
    case "payment_failed":
      return {
        icon: <XCircle className="w-10 h-10 text-red-500" />,
        headline: "Payment failed",
        sub: "Your payment was not completed. You can try again.",
        color: "red",
      };
    case "print_failed":
      return {
        icon: <XCircle className="w-10 h-10 text-red-500" />,
        headline: "Print failed",
        sub: paymentMethod === "cash" ? "Something went wrong at the printer. Please collect your cash back from the shop counter." : "Something went wrong at the printer. We’re checking your refund.",
        color: "red",
      };
    case "refunded":
      return {
        icon: <CheckCircle2 className="w-10 h-10 text-tint" />,
        headline: "Refund processed",
        sub: "Cashfree confirmed your refund. Your bank may take time to show the credit.",
        color: "green",
      };
    case "cancelled":
      return {
        icon: <XCircle className="w-10 h-10 text-zinc-400" />,
        headline: "Order cancelled",
        sub: "This order was cancelled.",
        color: "zinc",
      };
    default:
      return {
        icon: <Loader2 className="w-10 h-10 text-zinc-400 animate-spin" />,
        headline: "Checking status…",
        sub: "",
        color: "zinc",
      };
  }
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [job, setJob] = useState<Job | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSlow, setIsSlow] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatusRef = useRef<JobStatus | null>(null);
  const pollingRef = useRef(true);

  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineStatus, () => true);
  const isOffline = !isOnline;

  useEffect(() => {
    if (!jobId) return;
    pollingRef.current = true;

    async function pollJob() {
      if (!pollingRef.current) return;
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setFetchError("Job not found.");
            pollingRef.current = false;
            return;
          }
          throw new Error("fetch_error");
        }
        const data = await res.json();
        const fetched: Job = data.job;
        setJob(fetched);
        setFetchError(null);

        if (TERMINAL.includes(fetched.status)) {
          pollingRef.current = false;
          return;
        }

        if (prevStatusRef.current !== fetched.status) {
          prevStatusRef.current = fetched.status;
          setIsSlow(false);
          if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
          slowTimerRef.current = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS);
        }
      } catch {
        // offline or network hiccup
      }

      if (pollingRef.current) {
        timerRef.current = setTimeout(pollJob, POLL_INTERVAL);
      }
    }

    pollJob();

    return () => {
      pollingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [jobId]);



  if (!jobId || (!job && !fetchError)) {
    return (
      <div className="min-h-full">
        <NavBar title="Order" back="/app/history" backLabel="History" />
        <main className="flex items-center justify-center p-12 min-h-[60dvh]">
          <Loader2 className="w-8 h-8 animate-spin text-tint" />
        </main>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-full">
        <NavBar title="Order" back="/app/history" backLabel="History" />
        <main className="px-4 pt-10">
          <EmptyState
            icon={<AlertCircle className="w-6 h-6" />}
            title="Order not found"
            subtitle={fetchError}
            actionText="Back to History"
            actionHref="/app/history"
          />
        </main>
      </div>
    );
  }

  const cfg = getStatusConfig(job!.status, job!.payment_method);
  const isTerminal = TERMINAL.includes(job!.status);
  const isPrinted =
    job!.status === "printed" ||
    job!.status === "released" ||
    job!.status === "done";

  return (
    <div className="min-h-full pb-32">
      <NavBar title="Order" back="/app/history" backLabel="History" />

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Offline Alert */}
        {isOffline && (
          <div
            role="alert"
            className="glass-chrome flex items-center gap-2 rounded-full border-amber-200/70 bg-amber-50/85 px-4 py-2.5 text-[13px] font-medium text-amber-900"
          >
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>You&apos;re offline — retrying when connection restores</span>
          </div>
        )}

        {/* Hero Status Card */}
        <div className="glass-card rounded-[28px] px-6 py-8 text-center">
          <div className="flex justify-center mb-5">
            <span
              className={`flex h-20 w-20 items-center justify-center rounded-full ${
                isPrinted ? "bg-tint shadow-[0_10px_30px_rgba(12,131,31,0.35)]" : "bg-white/80 ring-1 ring-black/[0.05]"
              }`}
            >
              {cfg.icon}
            </span>
          </div>
          <h1 className="text-[24px] font-bold text-label tracking-[-0.03em] leading-tight">
            {cfg.headline}
          </h1>
          {cfg.sub && (
            <p className="text-[15px] text-secondary-label mt-2 leading-relaxed max-w-xs mx-auto">
              {cfg.sub}
            </p>
          )}
          {["dispatched", "awaiting_release"].includes(job!.status) && job!.queueAhead > 0 && (
            <div className="mt-5 rounded-2xl bg-tint/10 px-4 py-3 text-[14px] text-label" role="status" aria-live="polite">
              <p className="font-semibold">{job!.queueAhead} {job!.queueAhead === 1 ? "print" : "prints"} ahead of yours</p>
              <p className="mt-1">Estimated wait: about {job!.estimatedWaitMinutes} {job!.estimatedWaitMinutes === 1 ? "minute" : "minutes"}.</p>
            </div>
          )}
          {job!.status === "print_failed" && (
            <div className="mt-5 rounded-2xl bg-amber-500/10 px-4 py-3 text-[14px] text-amber-900" role="status" aria-live="polite">
              {job!.refundStatus === "pending" ? "Refund requested with Cashfree. We’re checking its progress." :
                job!.refundStatus === "failed" ? "The refund could not be processed automatically. Please contact the shop for help." :
                "We’re checking the refund request. This screen will update automatically."}
            </div>
          )}

        </div>

        {/* Slow banner */}
        {isSlow && !isTerminal && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-[20px] bg-amber-500/10 p-4 text-[13px] text-amber-900"
          >
            <Clock className="w-4 h-4 flex-shrink-0 text-amber-700" />
            <span>Taking longer than expected. Your printout will be ready shortly.</span>
          </div>
        )}

        {/* Order details Card */}
        <div className="glass-card divide-y divide-black/[0.06] overflow-hidden rounded-[20px]">
          <DetailRow
            label="Pages"
            value={`${job!.pages} × ${job!.copies} cop${job!.copies !== 1 ? "ies" : "y"}`}
          />
          <DetailRow label="Type" value={job!.color ? "Colour" : "Black & white"} />
          <DetailRow label="Paper" value={job!.paper} />
          <DetailRow label="Sides" value={job!.duplex ? "Double-sided" : "Single-sided"} />
          <DetailRow
            label="Orientation"
            value={job!.orientation === "portrait" ? "Portrait" : "Landscape"}
          />
          <DetailRow label="Amount paid" value={formatPaise(job!.price_paise)} bold />
        </div>

        {/* CTAs */}
        {job!.status === "payment_failed" && job!.shop_id && (
          <Link
            href={`/app/print?shop=${job!.shop_id}`}
            style={{ touchAction: "manipulation" }}
            className="flex w-full min-h-[52px] items-center justify-center rounded-full bg-tint text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(12,131,31,0.30)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint focus-visible:ring-offset-2"
          >
            Try Again
          </Link>
        )}

        {job!.status === "print_failed" && (
          <div className="text-center text-[13px] text-secondary-label py-2">
            Need help? Please speak to the shop while we check your refund.
          </div>
        )}

        {/* Auto-refresh indicator */}
        {!isTerminal && !isOffline && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-1.5 text-[12px] text-zinc-500 py-1"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Auto-refreshing status…</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-4 px-4 py-3">
      <span className="text-[15px] text-secondary-label flex-shrink-0">{label}</span>
      <span
        className={`text-[15px] text-right ${
          bold ? "font-bold text-label" : "font-medium text-label"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
