import React from "react";

export interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  flex1?: boolean;
}

export function Pill({
  active,
  onClick,
  children,
  disabled,
  flex1,
  className = "",
  "aria-label": ariaLabel,
  ...props
}: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel}
      style={{ touchAction: "manipulation" }}
      className={`min-h-[48px] px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-indigo-600
        ${flex1 ? "flex-1 text-center" : ""}
        ${
          active
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80 active:bg-zinc-200"
        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
