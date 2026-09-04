import React from "react";

export interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled,
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      style={{ touchAction: "manipulation" }}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600
        ${checked ? "bg-indigo-600" : "bg-zinc-300"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm
          transition-transform duration-200 mt-1 ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}
