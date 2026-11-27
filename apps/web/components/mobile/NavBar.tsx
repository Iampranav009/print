"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface NavBarProps {
  title?: string;
  /** href to link back to, or a handler (e.g. router.back) */
  back?: string | (() => void);
  backLabel?: string;
  right?: React.ReactNode;
}

const BACK_CLASS =
  "-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pl-1 pr-3 text-[17px] font-medium text-tint transition-opacity active:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint";

export function NavBar({ title, back, backLabel = "Back", right }: NavBarProps) {
  const backContent = (
    <>
      <ChevronLeft className="h-6 w-6" strokeWidth={2.4} aria-hidden />
      {backLabel}
    </>
  );

  return (
    <header className="glass-chrome sticky top-0 z-30 rounded-none border-x-0 border-t-0 border-b-black/[0.06] shadow-none pt-[env(safe-area-inset-top)]">
      <div className="grid h-[52px] grid-cols-[1fr_auto_1fr] items-center px-4">
        <div className="flex justify-start">
          {typeof back === "string" && (
            <Link href={back} className={BACK_CLASS} style={{ touchAction: "manipulation" }}>
              {backContent}
            </Link>
          )}
          {typeof back === "function" && (
            <button type="button" onClick={back} className={BACK_CLASS} style={{ touchAction: "manipulation" }}>
              {backContent}
            </button>
          )}
        </div>
        <h1 className="max-w-[52vw] truncate text-center text-[17px] font-semibold tracking-[-0.02em] text-label">
          {title}
        </h1>
        <div className="flex justify-end">{right}</div>
      </div>
    </header>
  );
}

export function LargeTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="min-w-0">
        {subtitle && <p className="text-[13px] font-medium text-secondary-label">{subtitle}</p>}
        <h1 className="mt-0.5 text-[32px] font-bold leading-tight tracking-[-0.035em] text-label">{title}</h1>
      </div>
      {right}
    </header>
  );
}
