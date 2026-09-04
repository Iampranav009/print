"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
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
  | "cancelled";

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

// ── Constants ──────────────────────────────────────────────────────────────────

const TERMINAL: JobStatus[] = ["done", "printed", "payment_failed", "print_failed", "cancelled"];
const POLL_INTERVAL = 4000;
const SLOW_THRESHOLD_MS = 3 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2)}`;
}

// ── Status configs ────────────────────────────────────────────────────────────

function getStatusConfig(status: JobStatus) {
  switch (status) {
    case "payment_pending":
      return {
        icon: <Clock className="w-10 h-10 text-amber-500" />,
        headline: "Confirming payment…",
        sub: "Waiting for your bank to confirm. This usually takes under a minute.",
        color: "amber",
      };
    case "queued":
      return {
        icon: <Clock className="w-10 h-10 text-zinc-400" />,
        headline: "Job queued",
        sub: "The print shop will pick this up shortly.",
        color: "zinc",
      };
    case "downloading":
      return {
        icon: <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />,
        headline: "Preparing your file…",
        sub: "Sending your document to the printer.",
        color: "blue",
      };
    case "printing":
      return {
        icon: <Printer className="w-10 h-10 text-blue-600 animate-pulse" />,
        headline: "Printing now…",
        sub: "Your document is on the printer.",
        color: "blue",
      };
    case "awaiting_release":
      return {
        icon: (
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <CheckCircle2 className="w-11 h-11 text-emerald-600 dark:text-emerald-400" />
          </div>
        ),
        headline: "Ready to collect!",
        sub: "Show the code below at the counter.",
        color: "emerald",
      };
    case "released":
    case "printed":
    case "done":
      return {
        icon: (
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <CheckCircle2 className="w-11 h-11 text-emerald-600 dark:text-emerald-400" />
          </div>
        ),
        headline: "Collected — enjoy!",
        sub: "Your printout has been released. Thanks for using PrintBuddy.",
        color: "emerald",
      };
    case "payment_failed":
      return {
        icon: <XCircle className="w-10 h-10 text-red-500" />,
        headline: "Payment failed",
        sub: "Your payment wasn't completed. You can try again with a new order.",
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function JobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStatusRef = useRef<JobStatus | null>(null);
  const pollingRef = useRef(true);

  useEffect(() => {
    params.then((p) => setJobId(p.jobId));
  }, [params]);

  useEffect(() => {
    const online = () => setIsOffline(false);
    const offline = () => setIsOffline(true);
    setIsOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  // ── Poll job ────────────────────────────────────────────────────────────────
  const fetchJob = useCallback(async () => {
    if (!jobId || !pollingRef.current) return;
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
      const { job: fetched }: { job: Job } = await res.json();
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
      // silent — offline banner shows
    }
    if (pollingRef.current) {
      timerRef.current = setTimeout(fetchJob, POLL_INTERVAL);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    pollingRef.current = true;
    fetchJob();
    return () => {
      pollingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [fetchJob, jobId]);

  const handleCopyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — code is already visible and selectable
    }
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!jobId || (!job && !fetchError)) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-zinc-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Order not found</h1>
          <p className="text-sm text-zinc-500 mt-1">{fetchError}</p>
        </div>
      </main>
    );
  }

  const cfg = getStatusConfig(job!.status);
  const isTerminal = TERMINAL.includes(job!.status);
  const isAwaiting = job!.status === "awaiting_release";

  return (
    <>
      {/* Offline banner */}
      {isOffline && (
        <div
          role="alert"
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500 text-white text-sm py-2.5 px-4"
        >
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          You&apos;re offline — retrying when connection restores
        </div>
      )}

      <main
        className="flex flex-1 flex-col max-w-lg mx-auto w-full px-4 pb-10 gap-4"
        style={{ paddingTop: isOffline ? "60px" : "28px" }}
      >
        {/* Hero status card */}
        <div
          className={`rounded-3xl p-7 text-center border shadow-sm
            ${isAwaiting
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            }`}
        >
          <div className="flex justify-center mb-5">{cfg.icon}</div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
            {cfg.headline}
          </h1>
          {cfg.sub && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
              {cfg.sub}
            </p>
          )}

          {/* Release code — tap to copy */}
          {isAwaiting && job!.release_code && (
            <div className="mt-7">
              <p className="text-[11px] font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4">
                Release code
              </p>
              <button
                onClick={() => handleCopyCode(job!.release_code!)}
                style={{ touchAction: "manipulation" }}
                aria-label={`Release code ${job!.release_code} — tap to copy`}
                className="block w-full"
              >
                <div
                  className="text-6xl font-black tracking-[0.3em] tabular-nums text-zinc-900 dark:text-zinc-50 select-all py-2"
                  aria-live="assertive"
                >
                  {job!.release_code}
                </div>
                <div
                  className={`flex items-center justify-center gap-1.5 text-sm mt-2 transition-colors ${
                    copied
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {copied ? (
                    <><Check className="w-3.5 h-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Tap to copy</>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Print failure reason */}
          {job!.status === "print_failed" && job!.failure_reason && (
            <div className="mt-4 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl p-3.5 text-left">
              <span className="font-semibold">Details: </span>
              {job!.failure_reason}
            </div>
          )}
        </div>

        {/* Slow banner */}
        {isSlow && !isTerminal && (
          <div
            role="status"
            className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded-2xl p-4 text-sm"
          >
            <Clock className="w-5 h-5 flex-shrink-0" />
            <span>
              Taking longer than usual — the shop may be busy. Your printout will be ready soon.
            </span>
          </div>
        )}

        {/* Order details */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <Row label="Order" value={`#${job!.id.slice(0, 8).toUpperCase()}`} />
          <Row label="Pages" value={`${job!.pages} × ${job!.copies} cop${job!.copies !== 1 ? "ies" : "y"}`} />
          <Row label="Type" value={job!.color ? "Colour" : "Black & white"} />
          <Row label="Paper" value={job!.paper} />
          <Row label="Sides" value={job!.duplex ? "Double-sided" : "Single-sided"} />
          <Row label="Orientation" value={job!.orientation === "portrait" ? "Portrait" : "Landscape"} />
          <Row label="Amount paid" value={formatPaise(job!.price_paise)} bold />
        </div>

        {/* CTAs */}
        {job!.status === "payment_failed" && job!.shop_id && (
          <a
            href={`/s/${job!.shop_id}`}
            style={{ touchAction: "manipulation" }}
            className="block w-full min-h-[54px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-2xl text-base text-center leading-[54px] active:bg-zinc-700 dark:active:bg-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
          >
            Try again
          </a>
        )}
        {job!.status === "print_failed" && (
          <div className="text-center text-sm text-zinc-500">
            Please visit the counter
            {job!.shop_id && (
              <>
                {" "}or{" "}
                <a
                  href={`/s/${job!.shop_id}`}
                  className="underline underline-offset-2 font-medium text-zinc-700 dark:text-zinc-300"
                >
                  try a new order
                </a>
              </>
            )}
            .
          </div>
        )}

        {/* Polling indicator */}
        {!isTerminal && !isOffline && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 pb-2"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            Auto-refreshing every 4 seconds
          </div>
        )}
      </main>
    </>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-500 flex-shrink-0">{label}</span>
      <span
        className={`text-sm text-right ${
          bold
            ? "font-semibold text-zinc-900 dark:text-zinc-50"
            : "text-zinc-700 dark:text-zinc-300"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
