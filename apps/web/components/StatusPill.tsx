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
  created: { label: "New", className: "bg-gray-100 text-gray-600" },
  priced: { label: "Priced", className: "bg-yellow-100 text-yellow-700" },
  awaiting_payment: { label: "Pay Now", className: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", className: "bg-green-100 text-green-700" },
  awaiting_release: { label: "Ready", className: "bg-green-100 text-green-700" },
  dispatched: { label: "Dispatched", className: "bg-green-100 text-green-700" },
  printing: { label: "Printing", className: "bg-yellow-100 text-yellow-700" },
  printed: { label: "Printed", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500" },
  expired: { label: "Expired", className: "bg-gray-100 text-gray-500" },
  payment_failed: { label: "Failed", className: "bg-red-100 text-red-600" },
  print_failed: { label: "Error", className: "bg-red-100 text-red-600" },
  refunded: { label: "Refunded", className: "bg-yellow-100 text-yellow-700" },
};

export function StatusPill({ status }: { status: JobStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
