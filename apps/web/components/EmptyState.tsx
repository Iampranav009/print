import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actionText?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionText,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
      <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4 text-zinc-500">
        {icon}
      </div>
      <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
      <p className="text-sm text-zinc-500 mt-1 mb-6 leading-relaxed">
        {subtitle}
      </p>
      {actionText && actionHref && (
        <a
          href={actionHref}
          style={{ touchAction: "manipulation" }}
          className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          {actionText}
        </a>
      )}
      {actionText && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          style={{ touchAction: "manipulation" }}
          className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
