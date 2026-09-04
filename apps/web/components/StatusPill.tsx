import React from "react";

export type JobStatus =
  | "queued"
  | "downloading"
  | "printing"
  | "awaiting_release"
  | "released"
  | "printed"
  | "done"
  | "payment_pending"
  | "payment_failed"
  | "print_failed"
  | "cancelled"
  | "priced"
  | "awaiting_payment"
  | "paid"
  | "dispatched"
  | "refunded";

interface StatusPillProps {
  status: JobStatus | string;
  className?: string;
}

export function formatStatusLabel(status: string): string {
  switch (status) {
    case "awaiting_release":
      return "Ready to collect";
    case "payment_pending":
    case "awaiting_payment":
      return "Payment pending";
    case "downloading":
      return "Preparing";
    case "printing":
      return "Printing";
    case "printed":
    case "released":
    case "done":
      return "Completed";
    case "payment_failed":
      return "Payment failed";
    case "print_failed":
      return "Print failed";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
    case "queued":
      return "Queued";
    case "dispatched":
      return "Dispatched";
    case "paid":
      return "Paid";
    case "priced":
      return "Priced";
    default:
      return status.replace(/_/g, " ");
  }
}

export function StatusPill({ status, className = "" }: StatusPillProps) {
  let colorStyles = "bg-zinc-100 text-zinc-700 border-zinc-200";

  switch (status) {
    case "done":
    case "printed":
    case "released":
      colorStyles = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "payment_pending":
    case "awaiting_payment":
    case "awaiting_release":
    case "printing":
    case "downloading":
    case "dispatched":
      colorStyles = "bg-amber-50 text-amber-800 border-amber-200";
      break;
    case "payment_failed":
    case "print_failed":
      colorStyles = "bg-red-50 text-red-700 border-red-200";
      break;
    case "queued":
    case "cancelled":
    case "refunded":
    case "priced":
    default:
      colorStyles = "bg-zinc-100 text-zinc-700 border-zinc-200";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colorStyles} ${className}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}
