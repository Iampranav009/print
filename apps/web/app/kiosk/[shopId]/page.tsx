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

  // Helper to extract clean file name
  const extractFileName = (filePath?: string | null) => {
    if (!filePath) return "Document.pdf";
    const parts = filePath.split("/");
    const raw = parts[parts.length - 1] || "Document.pdf";
    return raw.replace(/^[0-9]+_/, "");
  };

  // Recompute active and recent jobs from an array of jobs
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

    // Active job: newest job whose status is NOT terminal
    const active = formattedJobs.find(
      (j) => !TERMINAL_STATUSES.includes(j.status)
    );
    setActiveJob(active || null);

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
            setLiveActivity((prev) =>
              prev && prev.kind === "uploading"
                ? { ...prev, percent: 100, fileName: evt.fileName }
                : { kind: "uploading", fileName: evt.fileName, fileCount: 1, percent: 100 }
            );
            showToast("success", `Upload complete — ${evt.pageCount} page${evt.pageCount !== 1 ? "s" : ""}`);
            // Give the "100% complete" bar a moment, then let the checkout
            // event or DB status take over.
            liveExpiryRef.current = setTimeout(() => setLiveActivity(null), 4000);
            break;

          case "checkout:opened":
            setLiveActivity({
              kind: "checkout",
              fileName: evt.fileName,
              amountPaise: evt.amountPaise,
            });
            break;

          case "checkout:dismissed":
            // Only clear if we're still showing checkout for this session.
            setLiveActivity((prev) =>
              prev && prev.kind === "checkout" ? null : prev
            );
            showToast("info", "Payment window closed");
            break;
        }
      })
      .subscribe();

    // Fallback polling interval every 12 seconds
    const interval = setInterval(fetchLatestJobs, 12000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (liveExpiryRef.current) clearTimeout(liveExpiryRef.current);
    };
  }, [shopId, updateJobStates, showToast]);

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
        showToast("success", "Payment received");
        // The live checkout overlay is no longer relevant.
        setLiveActivity(null);
      }
      return;
    }

    switch (activeJob.status) {
      case "printing":
        showToast("info", "Printing now…");
        break;
      case "awaiting_release":
        showToast("success", `Ready to collect — code ${activeJob.release_code ?? ""}`);
        break;
      case "printed":
        showToast("success", "Print complete");
        break;
      case "payment_failed":
        showToast("error", "Payment failed");
        break;
      case "print_failed":
        showToast("error", "Print failed");
        break;
    }
  }, [activeJob, showToast]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-[#0F172A] text-white flex items-center justify-center p-8">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
      </main>
    );
  }

  if (error || !shop) {
    return (
      <main className="min-h-dvh bg-[#0F172A] text-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Kiosk Unavailable</h1>
        <p className="text-zinc-400 max-w-sm mb-6 leading-relaxed">
          {error || "Could not find printer node. Please verify the URL."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ touchAction: "manipulation" }}
          className="min-h-[48px] px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
        >
          Retry Connection
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#0F172A] text-white flex flex-col lg:flex-row overflow-x-hidden relative">
      {/* Left Half — QR Block (Landscape 50%, or Stacked Top in Portrait) */}
      <section
        aria-label="Shop QR Code"
        className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 lg:border-r border-zinc-800/80 min-h-[50dvh] lg:min-h-dvh"
      >
        <KioskQR
          shopId={shop.id}
          shopName={shop.name}
          location={shop.location}
        />
      </section>

      {/* Right Half — Live Status Area (Landscape 50%, or Stacked Bottom in Portrait) */}
      <section
        aria-label="Live Printer Status"
        className="w-full lg:w-1/2 flex flex-col justify-center min-h-[50dvh] lg:min-h-dvh"
      >
        <KioskStatus
          activeJob={activeJob}
          recentJobs={recentJobs}
          liveActivity={liveActivity}
        />
      </section>

      {/* Toast overlay — shown for 5s on important state transitions */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] pointer-events-none"
        >
          <div
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl border backdrop-blur ${
              toast.kind === "success"
                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-100"
                : toast.kind === "error"
                ? "bg-red-500/15 border-red-400/40 text-red-100"
                : "bg-blue-500/15 border-blue-400/40 text-blue-100"
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
    </main>
  );
}
