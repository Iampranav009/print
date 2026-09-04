"use client";

import { PrinterStatusPill, type PrinterStatusData } from "./PrinterStatusPill";

interface PrinterModeToggleProps {
  mode: "test" | "real";
  status: PrinterStatusData | null;
  onModeChange: (newMode: "test" | "real") => void;
  disabled?: boolean;
}

export function PrinterModeToggle({
  mode,
  status,
  onModeChange,
  disabled = false,
}: PrinterModeToggleProps) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Printer mode</h2>
        <p className="text-sm text-zinc-500 mt-1 leading-relaxed max-w-2xl">
          Test mode uses PrintBuddy&apos;s virtual printer — pay-per-print flow works end-to-end
          without real hardware. Switch to Real to connect the printer at your shop.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        {/* Segmented Control (~360px) */}
        <div
          role="radiogroup"
          aria-label="Printer mode selection"
          className="w-full sm:w-[360px] bg-zinc-100 p-1 rounded-2xl flex items-center gap-1 border border-zinc-200/50 select-none"
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === "test"}
            disabled={disabled}
            onClick={() => onModeChange("test")}
            className={`flex-1 py-2 px-5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50 ${
              mode === "test"
                ? "bg-zinc-900 text-white shadow-sm"
                : "bg-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Test
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "real"}
            disabled={disabled}
            onClick={() => onModeChange("real")}
            className={`flex-1 py-2 px-5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50 ${
              mode === "real"
                ? "bg-zinc-900 text-white shadow-sm"
                : "bg-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Real
          </button>
        </div>

        {/* Small Status Pill to the right */}
        <PrinterStatusPill status={status} isLink={false} />
      </div>
    </div>
  );
}
