import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actionText?: string;
  onAction?: () => void;
  actionHref?: string;
}

const ACTION_CLASS =
  "mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-tint px-6 text-[15px] font-semibold text-white shadow-[0_6px_18px_rgba(12,131,31,0.28)] transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint focus-visible:ring-offset-2";

export function EmptyState({
  icon,
  title,
  subtitle,
  actionText,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center rounded-[20px] px-6 py-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-tint/10 text-tint">
        {icon}
      </div>
      <h2 className="text-[17px] font-semibold text-label">{title}</h2>
      <p className="mt-1 max-w-xs text-[14px] leading-relaxed text-secondary-label">{subtitle}</p>
      {actionText && actionHref && (
        <Link href={actionHref} style={{ touchAction: "manipulation" }} className={ACTION_CLASS}>
          {actionText}
        </Link>
      )}
      {actionText && onAction && !actionHref && (
        <button type="button" onClick={onAction} style={{ touchAction: "manipulation" }} className={ACTION_CLASS}>
          {actionText}
        </button>
      )}
    </div>
  );
}
