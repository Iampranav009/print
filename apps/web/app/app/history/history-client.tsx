"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText, Clock } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { LargeTitle } from "@/components/mobile/NavBar";
import { formatRelativeTime } from "@/lib/date-utils";
import type { Job } from "@/lib/jobs";

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2)}`;
}

export function HistoryClient({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs] = useState<Job[]>(initialJobs);

  return (
    <div className="min-h-full pb-32">
      <LargeTitle title="History" subtitle="Every print job on this account" />

      <div className="px-4">
        {jobs.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-6 w-6" aria-hidden />}
            title="No prints yet"
            subtitle="Your history will appear here after your first print."
            actionText="Start a print"
            actionHref="/app/scan"
          />
        ) : (
          <>
            <p className="mb-2 px-1 text-[13px] font-semibold text-secondary-label">
              {jobs.length} print{jobs.length !== 1 ? "s" : ""}
            </p>
            <ul className="space-y-2.5">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/app/history/${job.id}`}
                    style={{ touchAction: "manipulation" }}
                    className="glass-card flex items-center gap-3 rounded-[20px] p-3.5 transition-transform duration-200 ease-spring active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-tint/10 text-tint">
                      <FileText className="h-5 w-5" aria-hidden />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-label">
                        {job.file_name || `Print #${job.id.slice(0, 6)}`}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[13px] text-secondary-label">
                        <span className="truncate">{job.shop_name}</span>
                        <span aria-hidden>·</span>
                        <span className="whitespace-nowrap">{formatRelativeTime(job.created_at)}</span>
                      </span>
                    </span>

                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusPill status={job.status} />
                      <span className="text-[15px] font-bold tabular-nums text-label">{formatPaise(job.price_paise)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
