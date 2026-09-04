"use client";

import React from "react";
import Link from "next/link";
import { Printer, ChevronRight, QrCode, Sparkles, ShieldCheck, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-full bg-white pb-24">
      {/* Page Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Good morning</p>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">PrintBuddy</h1>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center border border-green-200/60 shadow-xs">
            <span className="text-green-700 font-bold text-base">P</span>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* Enlarged Hero Banner — Print at Kiosk */}
        <Link
          href="/app/print"
          style={{ touchAction: "manipulation" }}
          aria-label="Print at Kiosk - Scan / Locate"
          className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-3xl"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 via-gray-900 to-black p-6 sm:p-8 min-h-[260px] flex flex-col justify-between shadow-xl shadow-gray-900/10 border border-gray-800 transition-all duration-200 group-hover:scale-[1.01] group-active:scale-[0.99]">
            {/* Ambient Background Lights & Rings */}
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-green-500/15 blur-2xl pointer-events-none" />
            <div className="absolute top-10 right-4 w-40 h-40 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-32 h-32 rounded-full bg-yellow-500/10 blur-xl pointer-events-none" />

            {/* Top Row: Tag / Badge */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-green-300">
                <Sparkles className="w-3 h-3 text-green-400" />
                <span>Self-Serve Kiosk</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90">
                <QrCode className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Illustration Watermark / Kiosk Visual */}
            <div className="absolute right-4 bottom-5 w-32 h-36 flex items-end justify-center pointer-events-none opacity-85">
              <div className="relative flex flex-col items-center">
                {/* Kiosk Head / Screen */}
                <div className="w-20 h-24 bg-gradient-to-b from-gray-700 to-gray-800 rounded-2xl border border-gray-600 shadow-2xl flex flex-col items-center justify-start p-2 gap-1.5">
                  <div className="w-full h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-inner">
                    <Printer className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div className="w-12 h-1 bg-white/40 rounded-full" />
                  <div className="w-8 h-1 bg-green-400/80 rounded-full" />
                  <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>
                {/* Kiosk Stand */}
                <div className="w-6 h-6 bg-gray-700 border-x border-gray-600" />
                {/* Kiosk Base */}
                <div className="w-24 h-3 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 rounded-full shadow-lg" />
              </div>
            </div>

            {/* Main Content Info */}
            <div className="relative z-10 max-w-[70%] mt-6">
              <h2 className="text-white font-extrabold text-2xl sm:text-3xl leading-tight tracking-tight">
                Print at Kiosk
              </h2>
              <p className="text-gray-300 text-sm font-medium mt-1.5 flex items-center gap-1.5">
                <span>Scan</span>
                <span className="w-1 h-1 rounded-full bg-gray-500" />
                <span>Locate</span>
                <span className="w-1 h-1 rounded-full bg-gray-500" />
                <span>Instant Print</span>
              </p>
              <p className="text-gray-400 text-xs mt-2 leading-relaxed hidden sm:block">
                Upload your files directly from your phone and release at any nearby printer.
              </p>
            </div>

            {/* Bottom CTA Button */}
            <div className="relative z-10 mt-6">
              <div className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-900 font-bold text-sm sm:text-base rounded-full px-6 py-3 shadow-lg shadow-black/20 transition-all">
                <span>Print Now</span>
                <ChevronRight className="w-4 h-4 text-gray-900 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </Link>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Zero Wait Time</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Pay via UPI &amp; collect</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">100% Private</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Files auto-deleted</p>
            </div>
          </div>
        </div>

        {/* Delivery Promo Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-700 to-gray-800 p-5 min-h-[110px] flex items-center justify-between">
          <div className="relative z-10 max-w-[65%]">
            <h3 className="text-white font-bold text-sm sm:text-base leading-snug">
              Get your Prints Delivered to your Doorstep
            </h3>
            <span className="inline-block mt-1 text-[11px] font-semibold text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
            🛵
          </div>
        </div>
      </div>
    </div>
  );
}
