"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText, Clock } from "lucide-react";
import { StatusPill, type JobStatus } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
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

  if (!jobs || jobs.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center min-h-[calc(100dvh-130px)] px-4 py-8">
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="No prints yet"
          subtitle="Your history will appear here after your first print"
          actionText="Start a print"
          actionHref="/app/scan"
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-3 pb-24">
      <div className="flex items-center justify-between pb-1">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Past Prints ({jobs.length})
        </p>
      </div>

      <div className="space-y-2.5">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/app/history/${job.id}`}
            style={{ touchAction: "manipulation" }}
            className="block bg-white hover:bg-zinc-50/80 active:bg-zinc-100 rounded-2xl p-4 border border-zinc-100 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <div className="flex items-center gap-3.5">
              {/* File Icon */}
              <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-500">
                <FileText className="w-5 h-5" />
              </div>

              {/* Middle Column */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900 truncate">
                  {job.file_name || `Print #${job.id.slice(0, 6)}`}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5 truncate">
                  <span>{job.shop_name}</span>
                  <span>•</span>
                  <span>{formatRelativeTime(job.created_at)}</span>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <StatusPill status={job.status} />
                <span className="text-sm font-bold tabular-nums text-zinc-900">
                  {formatPaise(job.price_paise)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
