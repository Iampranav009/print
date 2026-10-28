"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Printer, RefreshCw, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusPill, type JobStatus } from "@/components/StatusPill";

interface QueueJob {
  id: string;
  status: JobStatus;
  display_name: string | null;
  file_name: string;
  pages: number;
  copies: number;
  color: boolean;
  price_paise: number;
  created_at: string;
  updated_at: string;
  waiting_seconds: number;
  needs_attention: boolean;
}

interface QueueResponse {
  connection: {
    agent_online: boolean;
    printer_online: boolean;
    printer_name: string | null;
    last_seen_at: string | null;
  };
  jobs: QueueJob[];
}

function waitingLabel(seconds: number) {
  if (seconds < 60) return "Less than a minute";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ${minutes % 60} min`;
}

export function VendorPrintQueue({ shopId }: { shopId: string }) {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadQueue = useCallback(async () => {
    try {
      const response = await fetch("/api/vendor/jobs/queue", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load the print queue.");
      setData(result);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the print queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadQueue, 0);
    const timer = window.setInterval(loadQueue, 10_000);
    const supabase = createClient();
    const channel = supabase
      .channel(`vendor-print-queue-${shopId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "print_jobs",
        filter: `shop_id=eq.${shopId}`,
      }, loadQueue)
      .subscribe();
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [loadQueue, shopId]);

  const actOnJob = async (job: QueueJob, action: "retry" | "fail") => {
    if (action === "fail" && !window.confirm("Confirm that this print did not complete. HIMMER will close it and request a refund when an online payment is available.")) return;
    setWorkingId(job.id);
    setMessage("");
    try {
      const response = await fetch(`/api/vendor/jobs/${job.id}/print`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send this job to the printer.");
      setMessage(action === "fail"
        ? "Stalled job closed. The next saved print can now continue."
        : "Print request sent. The HIMMER app will collect it on its next check.");
      await loadQueue();
    } catch (printError) {
      setMessage(printError instanceof Error ? printError.message : "Could not send this job to the printer.");
    } finally {
      setWorkingId(null);
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl border border-zinc-100 bg-white" aria-label="Loading print queue" />;
  }

  const jobs = data?.jobs ?? [];
  const connected = Boolean(data?.connection.agent_online && data?.connection.printer_online);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm" aria-labelledby="print-queue-title">
      <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="print-queue-title" className="text-lg font-semibold text-zinc-900">Print queue</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">{jobs.length} remaining</span>
          </div>
          <div className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${connected ? "text-emerald-700" : "text-amber-700"}`}>
            {connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected
              ? `${data?.connection.printer_name || "Printer"} connected`
              : "Printer or HIMMER app is offline — jobs remain saved here"}
          </div>
        </div>
        <button
          type="button"
          onClick={loadQueue}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          <RefreshCw className="h-4 w-4" /> Refresh queue
        </button>
      </div>

      {error && <p className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      {message && <p className="mx-5 mt-5 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800" role="status" aria-live="polite">{message}</p>}

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="mt-3 text-sm font-semibold text-zinc-800">All paid jobs are complete</p>
          <p className="mt-1 text-xs text-zinc-500">New paid jobs will appear here automatically.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100" role="list">
          {jobs.map((job, index) => (
            <li key={job.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">#{index + 1}</span>
                  <p className="truncate text-sm font-semibold text-zinc-900">{job.display_name || "Customer"} · {job.file_name}</p>
                  <StatusPill status={job.status} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {job.pages} page{job.pages === 1 ? "" : "s"} × {job.copies} · {job.color ? "Colour" : "B&W"} · waiting {waitingLabel(job.waiting_seconds)}
                </p>
                {job.needs_attention && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Needs attention — confirm the printer is ready, then retry.
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums text-zinc-800">₹{(job.price_paise / 100).toFixed(2)}</span>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => actOnJob(job, "retry")}
                  disabled={workingId === job.id || (!connected && !job.needs_attention)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" />
                  {workingId === job.id ? "Sending…" : job.needs_attention ? "Retry print" : "Print now"}
                </button>
                {job.status === "printing" && job.needs_attention && (
                  <button
                    type="button"
                    onClick={() => actOnJob(job, "fail")}
                    disabled={workingId === job.id}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50"
                  >
                    Failed · refund
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
