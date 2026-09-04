"use client";

import React, { useState, useEffect, useRef, useCallback, use, useSyncExternalStore } from "react";
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
  ChevronLeft,
} from "lucide-react";

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
  failure_reason: string | null;
  razorpay_order_id: string | null;
  created_at: string;
  updated_at: string;
}

const TERMINAL: JobStatus[] = [
  "done",
  "printed",
  "released",
  "payment_failed",
  "print_failed",
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

function getStatusConfig(status: JobStatus) {
  switch (status) {
    case "payment_pending":
    case "awaiting_payment":
      return {
        icon: <Clock className="w-10 h-10 text-amber-500" />,
        headline: "Confirming payment…",
        sub: "Waiting for bank confirmation. This usually takes under a minute.",
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
        icon: <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />,
        headline: "Preparing your file…",
        sub: "Rasterizing and sending document to printer.",
        color: "blue",
      };
    case "dispatched":
    case "awaiting_release":
    case "printing":
      return {
        icon: <Printer className="w-10 h-10 text-blue-600 animate-pulse" />,
        headline: "Printing now…",
        sub: "Your document is printing automatically. Collect it from the printer tray once done.",
        color: "blue",
      };
    case "released":
    case "printed":
    case "done":
      return {
        icon: (
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-11 h-11 text-green-500" />
          </div>
        ),
        headline: "Printed! Collect from tray",
        sub: "Your document has printed. Thank you for using PrintBuddy!",
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
        sub: "Something went wrong at the printer. Please contact the shop counter.",
        color: "red",
      };
    case "cancelled":
    case "refunded":
      return {
        icon: <XCircle className="w-10 h-10 text-zinc-400" />,
        headline: status === "refunded" ? "Order refunded" : "Order cancelled",
        sub: "This order was cancelled or refunded.",
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
      <main className="flex flex-1 items-center justify-center p-12 min-h-[calc(100dvh-130px)]">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center min-h-[calc(100dvh-130px)] gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-gray-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Order not found</h1>
          <p className="text-sm text-gray-500 mt-1">{fetchError}</p>
        </div>
        <Link
          href="/app/history"
          style={{ touchAction: "manipulation" }}
          className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-sm transition-colors mt-2 flex items-center"
        >
          Back to History
        </Link>
      </main>
    );
  }

  const cfg = getStatusConfig(job!.status);
  const isTerminal = TERMINAL.includes(job!.status);
  const isPrinted =
    job!.status === "printed" ||
    job!.status === "released" ||
    job!.status === "done";

  return (
    <div className="min-h-full bg-white pb-24">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-100">
        <Link
          href="/app/history"
          style={{ touchAction: "manipulation" }}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors py-1.5 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-lg"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Offline Alert */}
        {isOffline && (
          <div
            role="alert"
            className="flex items-center gap-2 bg-yellow-500 text-white text-xs py-2.5 px-4 rounded-xl shadow-sm"
          >
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>You&apos;re offline — retrying when connection restores</span>
          </div>
        )}

        {/* Hero Status Card */}
        <div
          className={`rounded-2xl p-7 text-center border shadow-sm ${
            isPrinted
              ? "bg-green-50 border-green-200"
              : "bg-white border-gray-100"
          }`}
        >
          <div className="flex justify-center mb-5">{cfg.icon}</div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
            {cfg.headline}
          </h1>
          {cfg.sub && (
            <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-xs mx-auto">
              {cfg.sub}
            </p>
          )}

          {/* Print failure reason */}
          {job!.status === "print_failed" && job!.failure_reason && (
            <div className="mt-5 text-xs bg-red-50 text-red-700 rounded-xl p-3.5 text-left border border-red-100">
              <span className="font-semibold">Reason: </span>
              {job!.failure_reason}
            </div>
          )}
        </div>

        {/* Slow banner */}
        {isSlow && !isTerminal && (
          <div
            role="status"
            className="flex items-center gap-3 bg-yellow-50 text-yellow-900 rounded-2xl p-4 text-xs border border-yellow-200/80"
          >
            <Clock className="w-4 h-4 flex-shrink-0 text-yellow-700" />
            <span>Taking longer than expected. Your printout will be ready shortly.</span>
          </div>
        )}

        {/* Order details Card */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <DetailRow label="Order" value={`#${job!.id.slice(0, 8).toUpperCase()}`} />
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
            className="block w-full min-h-[52px] bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-2xl text-sm text-center leading-[52px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 shadow-sm"
          >
            Try Again
          </Link>
        )}

        {job!.status === "print_failed" && (
          <div className="text-center text-xs text-gray-500 py-2">
            Please visit the counter
            {job!.shop_id && (
              <>
                {" "}or{" "}
                <Link
                  href={`/app/print?shop=${job!.shop_id}`}
                  className="underline underline-offset-2 font-medium text-green-600 hover:text-green-800"
                >
                  try a new order
                </Link>
              </>
            )}
            .
          </div>
        )}

        {/* Auto-refresh indicator */}
        {!isTerminal && !isOffline && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-1.5 text-xs text-gray-400 py-1"
          >
            <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
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
    <div className="flex items-center justify-between px-4 py-3.5 gap-4 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span
        className={`text-xs text-right ${
          bold ? "font-bold text-gray-900" : "text-gray-700 font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
