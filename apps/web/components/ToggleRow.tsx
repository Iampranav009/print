import React from "react";

export interface ToggleRowProps {
  label: string;
  id?: string;
  description?: string;
  children: React.ReactNode;
  noDivider?: boolean;
}

export function ToggleRow({
  label,
  id,
  description,
  children,
  noDivider,
}: ToggleRowProps) {
  return (
    <div
      className={`flex items-center justify-between py-4 gap-4 ${
        !noDivider ? "border-b border-zinc-100" : ""
      }`}
    >
      <div className="flex-1">
        <span id={id} className="text-sm font-medium text-zinc-900 block">
          {label}
        </span>
        {description && (
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
