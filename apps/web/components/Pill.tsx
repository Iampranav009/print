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
      className={`min-h-11 px-4 rounded-full text-[14px] font-semibold transition-all duration-200 ease-spring
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tint
        ${flex1 ? "flex-1 text-center" : ""}
        ${
          active
            ? "bg-tint text-white shadow-[0_4px_14px_rgba(12,131,31,0.28)]"
            : "bg-white/80 text-zinc-700 ring-1 ring-black/[0.06] active:bg-zinc-100"
        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-[0.97]"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
