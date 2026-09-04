"use client";

import React, { useEffect, useState, useCallback, useRef, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { KioskQR } from "@/components/KioskQR";
import { KioskStatus, type KioskJob, type KioskLiveActivity } from "@/components/KioskStatus";
import { type JobStatus } from "@/components/StatusPill";
import { Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import {
  KIOSK_BROADCAST_EVENT,
  kioskChannelName,
  type KioskEvent,
} from "@/lib/kiosk-events";

interface ShopDetails {
  id: string;
  name: string;
  location: string | null;
  virtual_mode?: boolean;
}

interface PrinterStatus {
  mode: "test" | "real";
  online: boolean;
  last_seen_at: string | null;
  connection_type: "wifi" | "usb" | "network" | null;
}

interface DbJob {
  id: string;
  shop_id: string;
  status: JobStatus;
  price_paise?: number;
  release_code: string | null;
  file_path?: string | null;
  file_name?: string | null;
  created_at: string;
  updated_at?: string;
}

const TERMINAL_STATUSES: JobStatus[] = [
  "printed",
  "payment_failed",
  "print_failed",
  "refunded",
];

export default function KioskPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const resolvedParams = use(params);
  const shopId = resolvedParams.shopId;

  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeJob, setActiveJob] = useState<KioskJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<KioskJob[]>([]);

  // Transient event from the customer's mobile session, arriving via
  // Supabase Realtime broadcast (WebSocket). Overrides the DB job for
  // the hero slot while it's fresh (< 60s old).
  const [liveActivity, setLiveActivity] = useState<KioskLiveActivity | null>(null);
  const liveExpiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenJobStatusesRef = useRef<Map<string, JobStatus>>(new Map());

  // Toast notifications for state transitions the operator should notice.
  const [toast, setToast] = useState<{
    kind: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((kind: "success" | "error" | "info", message: string) => {
    setToast({ kind, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // Retry-payment prompt shown when Razorpay reports the payment failed.
  const [retryPrompt, setRetryPrompt] = useState<{
    jobId: string;
    reason: string;
  } | null>(null);

  // After a successful print, count down from 5s and then return to idle
  // so the QR reappears for the next customer. Only runs on print:completed
  // — payment_failed / print_failed stay on screen until a new session.
  const [returnCountdown, setReturnCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearReturnCountdown = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    setReturnCountdown(null);
  }, []);
  const startReturnCountdown = useCallback(
    (seconds: number) => {
      clearReturnCountdown();
      setReturnCountdown(seconds);
      countdownTimerRef.current = setInterval(() => {
        setReturnCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
            // Time's up — return to idle so the QR reappears.
            setActiveJob(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearReturnCountdown]
  );

  // Helper to extract clean file name
  const extractFileName = (filePath?: string | null) => {
    if (!filePath) return "Document.pdf";
    const parts = filePath.split("/");
    const raw = parts[parts.length - 1] || "Document.pdf";
    return raw.replace(/^[0-9]+_/, "");
  };

  // Recompute active and recent jobs from an array of jobs.
  //
  // Sticky-state rule (user requirement): once the kiosk is displaying an
  // active job, only OVERWRITE it — never CLEAR it — from a DB refresh.
  // Clearing happens only when a new upload:start event arrives, i.e. a
  // fresh customer session begins. This is what makes "Print complete" and
  // "Payment rejected" stay on screen instead of flipping back to the QR.
  const updateJobStates = useCallback((allJobs: DbJob[]) => {
    const formattedJobs: KioskJob[] = allJobs.map((j) => ({
      id: j.id,
      shop_id: j.shop_id,
      status: j.status,
      price_paise: j.price_paise,
      release_code: j.release_code,
      file_name: extractFileName(j.file_path || j.file_name),
      created_at: j.created_at,
      updated_at: j.updated_at,
    }));

    // Prefer a live non-terminal job (that means work is in progress).
    const nonTerminal = formattedJobs.find(
      (j) => !TERMINAL_STATUSES.includes(j.status)
    );

    setActiveJob((prev) => {
      // 1. Fresh non-terminal job takes over immediately.
      if (nonTerminal) return nonTerminal;
      // 2. No live work in the DB and we're already showing something:
      //    keep showing it. Upload:start will clear this when a new
      //    session begins.
      if (prev) return prev;
      // 3. Nothing in flight, nothing showing → try to hydrate from the
      //    newest terminal row (e.g. server restart mid-session) so the
      //    operator sees "Print complete" instead of the QR.
      return formattedJobs[0] ?? null;
    });

    // Recent jobs: up to 3 terminal completed jobs
    const completed = formattedJobs
      .filter((j) => ["done", "printed", "released"].includes(j.status))
      .slice(0, 3);
    setRecentJobs(completed);
  }, []);

  // Initial fetch for shop and jobs
  useEffect(() => {
    if (!shopId) return;

    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch shop info
        const shopRes = await fetch(`/api/shops/${encodeURIComponent(shopId)}`);
        if (!shopRes.ok) {
          throw new Error("Shop not found or offline");
        }
        const shopData = await shopRes.json();
        if (!active) return;
        setShop(shopData.shop);
        if (shopData.printer_status) setPrinterStatus(shopData.printer_status);

        // 2. Fetch initial jobs for this shop
        const supabase = createClient();
        const { data: jobsData } = await supabase
          .from("print_jobs")
          .select("id, shop_id, status, price_paise, release_code, file_path, created_at, updated_at")
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (active && jobsData) {
          updateJobStates(jobsData as DbJob[]);
        }
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load kiosk");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [shopId, updateJobStates]);

  // Poll printer_status every 20s so the offline banner + connectivity
  // reflect the agent heartbeat within a reasonable window even without
  // full page refresh. Cheap request — just re-fetches /api/shops/:id.
  useEffect(() => {
    if (!shopId) return;
    const tick = async () => {
      try {
        const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.printer_status) setPrinterStatus(data.printer_status);
      } catch {
        // network hiccup — offline banner already handles the visible signal
      }
    };
    const iv = setInterval(tick, 20_000);
    return () => clearInterval(iv);
  }, [shopId]);

  // Realtime subscription
  useEffect(() => {
    if (!shopId) return;

    const supabase = createClient();

    const fetchLatestJobs = async () => {
      const { data } = await supabase
        .from("print_jobs")
        .select("id, shop_id, status, price_paise, release_code, file_path, created_at, updated_at")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        updateJobStates(data as DbJob[]);
      }
    };

    // Broadcast + DB changes ride on the same channel so we open only one
    // WebSocket. The mobile client posts { type: KIOSK_BROADCAST_EVENT }
    // events from lib/kiosk-events; DB status changes come through the
    // postgres_changes listener.
    const channel = supabase
      .channel(kioskChannelName(shopId), { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "print_jobs",
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          fetchLatestJobs();
        }
      )
      .on("broadcast", { event: KIOSK_BROADCAST_EVENT }, (msg) => {
        const evt = msg.payload as KioskEvent | undefined;
        if (!evt) return;

        // Any live event clears the previous expiry timer.
        if (liveExpiryRef.current) clearTimeout(liveExpiryRef.current);

        switch (evt.type) {
          case "upload:start":
            // A new customer session begins here — this is the ONLY moment
            // we clear a sticky terminal state (Print complete / Payment
            // rejected / Print failed) so the kiosk resets for the new one.
            setActiveJob(null);
            setRetryPrompt(null);
            clearReturnCountdown();
            setLiveActivity({
              kind: "uploading",
              fileName: evt.fileName,
              fileCount: evt.fileCount,
              percent: 0,
            });
            break;

          case "upload:progress":
            setLiveActivity((prev) =>
              prev && prev.kind === "uploading"
                ? { ...prev, percent: evt.percent }
                : { kind: "uploading", fileName: "Document", fileCount: 1, percent: evt.percent }
            );
            break;

          case "upload:done":
            // Hold the "100% complete" state until checkout begins or the
            // job transitions. NO auto-expiry — user must not see the QR
            // reappear mid-flow.
            setLiveActivity((prev) =>
              prev && prev.kind === "uploading"
                ? { ...prev, percent: 100, fileName: evt.fileName }
                : { kind: "uploading", fileName: evt.fileName, fileCount: 1, percent: 100 }
            );
            showToast("success", `Upload complete — ${evt.pageCount} page${evt.pageCount !== 1 ? "s" : ""}`);
            break;

          case "checkout:opened":
            setLiveActivity({
              kind: "checkout",
              fileName: evt.fileName,
              amountPaise: evt.amountPaise,
            });
            break;

          case "checkout:dismissed":
            // Keep the "Waiting for payment…" up — user may reopen Razorpay.
            // Toast is enough to signal what happened. Don't reveal QR.
            showToast("info", "Payment window closed");
            break;

          // ── Server-side events (broadcast from webhook / virtual ticker)
          // These arrive whether or not RLS lets anon see the DB row change.
          case "payment:success": {
            const synth: KioskJob = {
              id: evt.jobId,
              shop_id: shopId,
              status: "dispatched",
              price_paise: evt.amountPaise,
              release_code: null,
              file_name: evt.fileName,
              created_at: evt.sentAt,
              updated_at: evt.sentAt,
            };
            setActiveJob(synth);
            setLiveActivity(null);
            showToast("success", "Payment successful");
            // Refresh from DB in the background so subsequent state
            // transitions have full row data.
            fetchLatestJobs();
            break;
          }

          case "payment:failed": {
            const synth: KioskJob = {
              id: evt.jobId,
              shop_id: shopId,
              status: "payment_failed",
              release_code: null,
              file_name: undefined,
              created_at: evt.sentAt,
              updated_at: evt.sentAt,
            };
            setActiveJob(synth);
            setLiveActivity(null);
            setRetryPrompt({ jobId: evt.jobId, reason: evt.reason ?? "Payment was rejected" });
            showToast("error", "Payment rejected");
            fetchLatestJobs();
            break;
          }

          case "print:started": {
            setActiveJob((prev) =>
              prev
                ? { ...prev, status: "printing", updated_at: evt.sentAt }
                : {
                    id: evt.jobId,
                    shop_id: shopId,
                    status: "printing",
                    release_code: null,
                    file_name: evt.fileName,
                    created_at: evt.sentAt,
                    updated_at: evt.sentAt,
                  }
            );
            setLiveActivity(null);
            showToast("info", "Printing now…");
            break;
          }

          case "print:completed": {
            setActiveJob((prev) =>
              prev
                ? { ...prev, status: "printed", updated_at: evt.sentAt }
                : {
                    id: evt.jobId,
                    shop_id: shopId,
                    status: "printed",
                    release_code: null,
                    file_name: evt.fileName,
                    created_at: evt.sentAt,
                    updated_at: evt.sentAt,
                  }
            );
            setLiveActivity(null);
            showToast("success", "Print complete");
            fetchLatestJobs();
            // Start the visible 5s "Returning to home in Xs" countdown.
            // Success is the ONLY state that auto-returns — failures stay
            // on screen until a new session.
            startReturnCountdown(5);
            break;
          }

          case "print:failed": {
            setActiveJob((prev) =>
              prev
                ? { ...prev, status: "print_failed", updated_at: evt.sentAt }
                : {
                    id: evt.jobId,
                    shop_id: shopId,
                    status: "print_failed",
                    release_code: null,
                    file_name: undefined,
                    created_at: evt.sentAt,
                    updated_at: evt.sentAt,
                  }
            );
            showToast("error", "Print failed");
            fetchLatestJobs();
            break;
          }
        }
      })
      .subscribe();

    // Fallback polling interval every 12 seconds
    const interval = setInterval(fetchLatestJobs, 12000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (liveExpiryRef.current) clearTimeout(liveExpiryRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [shopId, updateJobStates, showToast, startReturnCountdown, clearReturnCountdown]);

  // Notify on job status transitions the operator should notice: payment
  // captured (job appears with paid+ status), print done, or a failure.
  useEffect(() => {
    if (!activeJob) return;
    const prev = seenJobStatusesRef.current.get(activeJob.id);
    if (prev === activeJob.status) return;
    seenJobStatusesRef.current.set(activeJob.id, activeJob.status);

    if (!prev) {
      // First time we've seen this job — likely just came in from the webhook.
      if (["paid", "dispatched", "printing"].includes(activeJob.status)) {
        showToast("success", "Payment successful");
        // The live checkout overlay is no longer relevant.
        setLiveActivity(null);
      } else if (activeJob.status === "payment_failed") {
        showToast("error", "Payment rejected");
        setLiveActivity(null);
      }
      return;
    }

    switch (activeJob.status) {
      case "paid":
      case "dispatched":
        showToast("success", "Payment successful");
        setLiveActivity(null);
        break;
      case "printing":
        showToast("info", "Printing now…");
        break;
      case "printed":
        showToast("success", "Print complete");
        break;
      case "payment_failed":
        showToast("error", "Payment rejected");
        setLiveActivity(null);
        break;
      case "print_failed":
        showToast("error", "Print failed");
        break;
    }
  }, [activeJob, showToast]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-white text-zinc-900 flex items-center justify-center p-8">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </main>
    );
  }

  if (error || !shop) {
    return (
      <main className="min-h-dvh bg-white text-zinc-900 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4 text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Kiosk unavailable</h1>
        <p className="text-zinc-500 max-w-sm mb-6 leading-relaxed">
          {error || "Could not find printer node. Please verify the URL."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ touchAction: "manipulation" }}
          className="min-h-[48px] px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
        >
          Retry connection
        </button>
      </main>
    );
  }

  // QR visibility rule:
  // - Idle only. The moment any session activity starts (upload, checkout,
  //   payment result, printing), the QR goes away and the status takes the
  //   full screen, big and centered.
  const isBusy = !!liveActivity || !!activeJob;
  const showQR = !isBusy;

  // Offline banner appears ONLY in real mode when the printer's agent
  // hasn't heartbeated recently. Test/virtual mode always reads "online".
  const showOfflineBanner =
    !!printerStatus && printerStatus.mode === "real" && !printerStatus.online;

  return (
    <main className="min-h-dvh bg-white text-zinc-900 flex flex-col overflow-x-hidden relative">
      {showOfflineBanner && (
        <div
          role="alert"
          className="w-full bg-red-600 text-white text-center py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 z-30"
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-white/90 animate-pulse" />
          Printer disconnected — currently offline.
          <span className="text-white/80 font-normal hidden sm:inline">
            Prints will resume when the printer reconnects.
          </span>
        </div>
      )}
      {showQR ? (
        // ── Idle: QR + welcome, split evenly ────────────────────────────
        <div className="min-h-dvh flex flex-col lg:flex-row">
          <section
            aria-label="Shop QR Code"
            className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 lg:border-r border-zinc-100 min-h-[50dvh] lg:min-h-dvh"
          >
            <KioskQR
              shopId={shop.id}
              shopName={shop.name}
              location={shop.location}
            />
          </section>
          <section
            aria-label="Live Printer Status"
            className="w-full lg:w-1/2 flex flex-col justify-center min-h-[50dvh] lg:min-h-dvh"
          >
            <KioskStatus
              activeJob={activeJob}
              recentJobs={recentJobs}
              liveActivity={liveActivity}
              returnCountdown={returnCountdown}
            />
          </section>
        </div>
      ) : (
        // ── Active: full-screen centered status, no QR ──────────────────
        <section
          aria-label="Live Printer Status"
          className="min-h-dvh w-full flex flex-col justify-center items-center"
        >
          <div className="w-full max-w-3xl mx-auto text-center">
            <KioskStatus
              activeJob={activeJob}
              recentJobs={recentJobs}
              liveActivity={liveActivity}
              returnCountdown={returnCountdown}
              centered
            />
          </div>
        </section>
      )}

      {/* Toast overlay — auto-dismisses after 5s */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] pointer-events-none"
        >
          <div
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg border ${
              toast.kind === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : toast.kind === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-indigo-50 border-indigo-200 text-indigo-800"
            }`}
          >
            {toast.kind === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : toast.kind === "error" ? (
              <XCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <Loader2 className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Retry-payment modal — shown when Razorpay reports payment failed. */}
      {retryPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="retry-title"
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-6"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5 text-red-500">
              <XCircle className="w-11 h-11" />
            </div>
            <h2 id="retry-title" className="text-2xl font-bold text-zinc-900 mb-2">
              Payment rejected
            </h2>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              {retryPrompt.reason}. Please try again from your phone to complete the print.
            </p>
            <button
              type="button"
              onClick={() => setRetryPrompt(null)}
              className="w-full min-h-[52px] rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-base transition-colors"
            >
              Dismiss
            </button>
            <p className="text-xs text-zinc-400 mt-4">
              The rejection stays on screen. A new scan will start a fresh session.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
