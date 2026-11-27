import React from "react";

export type JobStatus =
  | "created"
  | "priced"
  | "awaiting_payment"
  | "paid"
  | "awaiting_release"
  | "dispatched"
  | "printing"
  | "printed"
  | "cancelled"
  | "expired"
  | "payment_failed"
  | "print_failed"
  | "refunded";

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; className: string }
> = {
  created: { label: "New", className: "bg-zinc-500/10 text-zinc-600" },
  priced: { label: "Priced", className: "bg-zinc-500/10 text-zinc-600" },
  awaiting_payment: { label: "Pay Now", className: "bg-amber-500/15 text-amber-700" },
  paid: { label: "Paid", className: "bg-tint/10 text-tint" },
  awaiting_release: { label: "Ready", className: "bg-tint/10 text-tint" },
  dispatched: { label: "Dispatched", className: "bg-tint/10 text-tint" },
  printing: { label: "Printing", className: "bg-sky-500/12 text-sky-700" },
  printed: { label: "Printed", className: "bg-tint text-white" },
  cancelled: { label: "Cancelled", className: "bg-zinc-500/10 text-zinc-500" },
  expired: { label: "Expired", className: "bg-zinc-500/10 text-zinc-500" },
  payment_failed: { label: "Failed", className: "bg-red-500/10 text-red-600" },
  print_failed: { label: "Error", className: "bg-red-500/10 text-red-600" },
  refunded: { label: "Refunded", className: "bg-violet-500/10 text-violet-700" },
};

export function StatusPill({ status }: { status: JobStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-zinc-500/10 text-zinc-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
