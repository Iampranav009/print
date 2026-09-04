"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { KioskQR } from "@/components/KioskQR";
import { KioskStatus, type KioskJob } from "@/components/KioskStatus";
import { type JobStatus } from "@/components/StatusPill";
import { Loader2, AlertCircle } from "lucide-react";

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

    const channel = supabase
      .channel(`kiosk:${shopId}`)
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
      .subscribe();

    // Fallback polling interval every 12 seconds
    const interval = setInterval(fetchLatestJobs, 12000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [shopId, updateJobStates]);

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
    <main className="min-h-dvh bg-[#0F172A] text-white flex flex-col lg:flex-row overflow-x-hidden">
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
        />
      </section>
    </main>
  );
}
