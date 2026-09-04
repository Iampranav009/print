"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText, Clock, ChevronRight, Printer } from "lucide-react";
import { StatusPill, type JobStatus } from "@/components/StatusPill";
import { formatRelativeTime } from "@/lib/date-utils";

export interface Job {
  id: string;
  shop_id: string;
  shop_name: string;
  user_id: string;
  status: JobStatus;
  price_paise: number;
  pages: number;
  copies: number;
  color: boolean;
  paper: string;
  duplex: boolean;
  orientation: "portrait" | "landscape";
  release_code: string | null;
  failure_reason: string | null;
  file_name: string;
  created_at: string;
  updated_at: string;
}

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2)}`;
}

export function HistoryClient({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs] = useState<Job[]>(initialJobs);

  return (
    <div className="min-h-full bg-white pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">History</h1>
        <p className="text-xs text-gray-500 mt-0.5">Every print job on this account</p>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 rounded-2xl bg-yellow-100 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 text-center">No prints yet</h3>
          <p className="text-sm text-gray-500 text-center mt-1 max-w-xs">
            Your history will appear here after your first print
          </p>
          <Link
            href="/app/scan"
            style={{ touchAction: "manipulation" }}
            className="mt-6 min-h-[48px] px-6 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-sm rounded-2xl flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <Printer className="w-4 h-4" />
            Start a print
          </Link>
        </div>
      ) : (
        <div className="px-4 space-y-2.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Past Prints ({jobs.length})
          </p>
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/app/history/${job.id}`}
              style={{ touchAction: "manipulation" }}
              className="flex items-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-2xl p-4 border border-gray-100 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              {/* File icon */}
              <div className="w-11 h-11 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>

              {/* Middle */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {job.file_name || `Print #${job.id.slice(0, 6)}`}
                </h3>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <span className="truncate">{job.shop_name}</span>
                  <span>·</span>
                  <span className="whitespace-nowrap">{formatRelativeTime(job.created_at)}</span>
                </div>
              </div>

              {/* Right */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <StatusPill status={job.status} />
                <span className="text-sm font-bold tabular-nums text-gray-900">
                  {formatPaise(job.price_paise)}
                </span>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
