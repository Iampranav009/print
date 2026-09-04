"use client";

import React from "react";
import { Clock, Loader2, Printer, CheckCircle2 } from "lucide-react";
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

interface KioskStatusProps {
  activeJob: KioskJob | null;
  recentJobs: KioskJob[];
}

export function KioskStatus({ activeJob, recentJobs }: KioskStatusProps) {
  // If idle
  if (!activeJob) {
    return (
      <div className="flex flex-col justify-between h-full p-8 lg:p-12 select-none">
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-6">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500" />
            </span>
            <span className="text-sm font-semibold tracking-wider text-indigo-400 uppercase">
              Printer Ready
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
            Ready when you are 🚀
          </h2>
          <p className="text-xl text-zinc-400 mt-4 max-w-md leading-relaxed">
            Scan the QR to start your print
          </p>
        </div>

        {/* Recent activity strip */}
        {recentJobs.length > 0 && (
          <div className="mt-8 pt-6 border-t border-zinc-800/80 opacity-70 transition-opacity hover:opacity-100">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Recent Activity
            </p>
            <div className="flex flex-wrap gap-4">
              {recentJobs.slice(0, 3).map((j) => (
                <div
                  key={j.id}
                  className="flex items-center gap-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-300 truncate max-w-[140px]">
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
        )}
      </div>
    );
  }

  // Active Job rendering
  let iconNode = (
    <div className="w-24 h-24 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
    </div>
  );
  let headline = "Processing print job…";
  let subline = "Please wait while we process your request.";

  switch (activeJob.status) {
    case "payment_pending":
    case "awaiting_payment":
      iconNode = (
        <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Clock className="w-12 h-12 text-amber-400" />
        </div>
      );
      headline = "Confirming payment…";
      subline = "Waiting for payment verification. Keep your phone handy.";
      break;
    case "downloading":
      iconNode = (
        <div className="w-24 h-24 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
        </div>
      );
      headline = "Preparing your file…";
      subline = "Downloading and rasterizing document for the printer.";
      break;
    case "printing":
      iconNode = (
        <div className="w-24 h-24 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center animate-pulse">
          <Printer className="w-12 h-12 text-blue-400" />
        </div>
      );
      headline = "Printing now…";
      subline = "Your pages are feeding through the printer.";
      break;
    case "awaiting_release":
      iconNode = (
        <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        </div>
      );
      headline = "Ready to collect!";
      subline = "Enter the release code below or show it to the shop operator.";
      break;
  }

  const isAwaitingRelease = activeJob.status === "awaiting_release";

  return (
    <div className="flex flex-col justify-between h-full p-8 lg:p-12 select-none">
      <div className="flex-1 flex flex-col justify-center space-y-6">
        {/* Status Icon */}
        <div className="flex items-center">{iconNode}</div>

        {/* Headline and Subtitle */}
        <div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            {headline}
          </h2>
          <p className="text-lg lg:text-xl text-zinc-400 mt-2 max-w-lg">
            {subline}
          </p>
        </div>

        {/* Big Release Code Display */}
        {isAwaitingRelease && activeJob.release_code && (
          <div className="pt-4">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-2">
              Release Code
            </p>
            <div className="text-7xl lg:text-8xl font-black tracking-[0.3em] text-white select-all">
              {activeJob.release_code}
            </div>
          </div>
        )}

        {/* File and Job Details */}
        <div className="pt-2 text-sm text-zinc-500 flex items-center gap-3">
          {activeJob.file_name && (
            <span className="font-medium text-zinc-400 truncate max-w-xs">
              {activeJob.file_name}
            </span>
          )}
          <span>•</span>
          <span>Job #{activeJob.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      {/* Recent Activity Strip */}
      {recentJobs.length > 0 && (
        <div className="mt-8 pt-6 border-t border-zinc-800/80 opacity-70">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Recent Activity
          </p>
          <div className="flex flex-wrap gap-3">
            {recentJobs.slice(0, 3).map((j) => (
              <div
                key={j.id}
                className="flex items-center gap-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm"
              >
                <span className="font-medium text-zinc-300 truncate max-w-[140px]">
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
      )}
    </div>
  );
}
