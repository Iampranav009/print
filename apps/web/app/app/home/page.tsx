"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Printer, ShieldCheck, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-full bg-canvas pb-28">
      <header className="px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-secondary-label">Good morning</p>
            <h1 className="mt-0.5 text-[28px] font-bold tracking-[-0.035em] text-label">PrintBuddy</h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft ring-1 ring-brand/10">
            <span className="text-sm font-bold text-brand">P</span>
          </div>
        </div>
      </header>

      <main className="space-y-5 px-4">
        <Link href="/app/scan" style={{ touchAction: "manipulation" }} aria-label="Scan a printer QR code to start" className="group block overflow-hidden rounded-[1.75rem] bg-brand text-white shadow-[0_14px_40px_rgba(12,131,31,0.18)] transition-transform active:scale-[0.99]">
          <div className="relative min-h-[260px] overflow-hidden p-7">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10" />
            <div className="absolute -bottom-24 right-10 h-52 w-52 rounded-full bg-black/10" />
            <div className="relative z-10 flex h-full min-h-[206px] flex-col justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/16 ring-1 ring-white/20 backdrop-blur-sm">
                <Printer className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/70">Ready in minutes</p>
                <h2 className="max-w-xs text-[32px] font-bold leading-[1.05] tracking-[-0.04em]">Scan. Pay. Print.</h2>
                <p className="mt-3 max-w-[17rem] text-[15px] leading-6 text-white/78">Connect to a nearby printer and get your pages without waiting at the counter.</p>
                <span className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-brand shadow-sm transition-transform group-active:scale-[0.98]">
                  Start printing
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </Link>

        <section aria-labelledby="quick-actions-title">
          <h2 id="quick-actions-title" className="mb-2.5 px-1 text-[13px] font-semibold text-secondary-label">Quick actions</h2>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.055]">
            <Link href="/app/nearby" className="flex min-h-[64px] items-center gap-3 px-4 transition-colors active:bg-zinc-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><MapPin className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <span className="flex-1"><span className="block text-[15px] font-semibold text-label">Find a printer</span><span className="block text-[12px] text-secondary-label">See available PrintBuddy shops nearby</span></span>
              <ChevronRight className="h-4 w-4 text-zinc-300" aria-hidden="true" />
            </Link>
            <div className="ml-16 h-px bg-black/[0.06]" />
            <div className="flex min-h-[64px] items-center gap-3 px-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500"><Sparkles className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <span className="flex-1"><span className="block text-[15px] font-semibold text-label">Doorstep delivery</span><span className="block text-[12px] text-secondary-label">Coming soon</span></span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Soon</span>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-center gap-2 pb-2 text-xs text-secondary-label"><ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />Files are removed after printing</div>
      </main>
    </div>
  );
}
