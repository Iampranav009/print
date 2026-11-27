"use client";

import React from "react";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
}

export function Segmented<T extends string>({ options, value, onChange, ariaLabel, size = "md" }: SegmentedProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const h = size === "sm" ? "h-8 text-[13px]" : "h-10 text-[14px]";

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="relative grid auto-cols-fr grid-flow-col rounded-[12px] bg-zinc-500/[0.12] p-[3px]"
    >
      <span
        aria-hidden
        className="absolute bottom-[3px] left-[3px] top-[3px] rounded-[9px] bg-white shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-spring"
        style={{
          width: `calc((100% - 6px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            style={{ touchAction: "manipulation" }}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-[9px] px-3 font-semibold transition-colors ${h} ${
              active ? "text-label" : "text-zinc-500"
            } disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
