import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function ListGroup({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between px-1">
          {title && <h2 className="text-[13px] font-semibold text-secondary-label">{title}</h2>}
          {action}
        </div>
      )}
      <div className="glass-card divide-y divide-black/[0.06] overflow-hidden rounded-[20px]">{children}</div>
    </section>
  );
}

interface ListRowProps {
  icon?: React.ReactNode;
  /** overrides the default green icon tile */
  iconClassName?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function ListRow({ icon, iconClassName, title, subtitle, trailing, href, onClick, disabled }: ListRowProps) {
  const interactive = Boolean(href || onClick);
  const body = (
    <>
      {icon && (
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
            iconClassName ?? "bg-tint/10 text-tint"
          }`}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-label">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[13px] text-secondary-label">{subtitle}</span>}
      </span>
      {trailing}
      {href && <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" aria-hidden />}
    </>
  );

  const cls = `flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left ${
    interactive ? "transition-colors active:bg-black/[0.04] disabled:opacity-50" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={cls} style={{ touchAction: "manipulation" }}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={cls} style={{ touchAction: "manipulation" }}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}
