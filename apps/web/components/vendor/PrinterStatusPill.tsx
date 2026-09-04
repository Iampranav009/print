"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";

export interface PrinterStatusData {
  mode: "test" | "real";
  online: boolean;
  connection_type?: string | null;
  last_seen_at?: string | null;
}

interface PrinterStatusPillProps {
  status?: PrinterStatusData | null;
  /** Whether clicking the pill routes to /vendor/printer (default: true) */
  isLink?: boolean;
  className?: string;
}

export function PrinterStatusPill({
  status: initialStatus,
  isLink = true,
  className = "",
}: PrinterStatusPillProps) {
  const [status, setStatus] = useState<PrinterStatusData | null>(initialStatus ?? null);

  // Sync if prop changes
  useEffect(() => {
    if (initialStatus !== undefined) {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  // If status is not provided via prop, fetch and poll every 30s
  useEffect(() => {
    if (initialStatus !== undefined) return;

    let active = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/vendor/printer");
        if (res.ok && active) {
          const data = await res.json();
          setStatus({
            mode: data.status?.mode ?? (data.shop?.virtual_mode ? "test" : "real"),
            online: !!data.status?.online,
            connection_type: data.printer?.connection_type ?? null,
            last_seen_at: data.status?.last_seen_at ?? null,
          });
        }
      } catch {
        // Network error — leave previous status or fallback
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [initialStatus]);

  // Derive visual state
  const isTest = status?.mode === "test";
  const isConfigured = Boolean(status?.connection_type);
  const isOnline = Boolean(status?.online);

  let badgeClass = "bg-zinc-100 text-zinc-600 border-zinc-200/60";
  let label = "Checking...";
  let dotOrIcon: React.ReactNode = (
    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
  );

  if (status) {
    if (isTest) {
      badgeClass = "bg-indigo-100 text-indigo-700 border-indigo-200/60";
      label = "Test mode";
      dotOrIcon = <Printer className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    } else if (!isConfigured) {
      badgeClass = "bg-zinc-100 text-zinc-600 border-zinc-200/60";
      label = "Not configured";
      dotOrIcon = <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />;
    } else if (isOnline) {
      badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200/60";
      label = "Online";
      dotOrIcon = <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />;
    } else {
      badgeClass = "bg-red-100 text-red-700 border-red-200/60";
      label = "Offline";
      dotOrIcon = <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />;
    }
  }

  const content = (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${badgeClass} ${className}`}
      title={isTest ? "Virtual printer — always ready" : isOnline ? "Printer is reachable" : "Printer not responding"}
    >
      {dotOrIcon}
      <span>{label}</span>
    </div>
  );

  if (isLink) {
    return (
      <Link
        href="/vendor/printer"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-full transition-transform active:scale-95"
        aria-label={`Printer status: ${label}. Click to view printer settings.`}
      >
        {content}
      </Link>
    );
  }

  return content;
}
