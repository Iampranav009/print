"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
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

/** Top bar for tab root screens: logo mark, screen title, trailing actions. */
export function TabTopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="glass-chrome sticky top-0 z-30 rounded-none border-x-0 border-t-0 border-b-black/[0.06] shadow-none pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Image src="/himmer-symbol-nav.png" alt="" aria-hidden width={28} height={28} className="shrink-0" priority />
        <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-[-0.03em] text-label">{title}</h1>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}

/** Round icon action for the top bar. */
export function TopBarLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      style={{ touchAction: "manipulation" }}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-tint/10 text-tint transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint"
    >
      {children}
    </Link>
  );
}
