import React from "react";

export interface ControlSectionProps {
  label: string;
  children: React.ReactNode;
  noDivider?: boolean;
  className?: string;
}

export function ControlSection({
  label,
  children,
  noDivider,
  className = "",
}: ControlSectionProps) {
  return (
    <div
      className={`py-4 ${
        !noDivider ? "border-b border-zinc-100" : ""
      } ${className}`}
    >
      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
