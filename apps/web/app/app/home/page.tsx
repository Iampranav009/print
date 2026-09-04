"use client";

import React from "react";
import Link from "next/link";
import { Printer, ChevronRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-full bg-white pb-24">
      {/* Page Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Good morning</p>
            <h1 className="text-xl font-bold text-gray-900">PrintBuddy</h1>
          </div>
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 font-bold text-sm">P</span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 pt-2">
        {/* Hero Banner — Print at Kiosk (Enlarged) */}
        <Link
          href="/app/scan"
          style={{ touchAction: "manipulation" }}
          aria-label="Scan a printer QR code to start"
          className="block"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-700 to-gray-900 p-7 min-h-[220px] flex flex-col justify-between shadow-sm">
            {/* Background decorative circles */}
            <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
            <div className="absolute bottom-0 right-12 w-28 h-28 rounded-full bg-white/5 translate-y-8" />

            {/* Kiosk illustration placeholder */}
            <div className="absolute right-5 bottom-6 w-28 h-32 flex items-end justify-center opacity-85">
              <div className="relative">
                {/* Kiosk body */}
                <div className="w-20 h-24 bg-gray-600 rounded-xl border border-gray-500 flex flex-col items-center justify-start pt-2 gap-1.5 shadow-lg">
                  <div className="w-14 h-10 bg-blue-500 rounded flex items-center justify-center">
                    <Printer className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-12 h-1 bg-white/30 rounded" />
                  <div className="w-12 h-1 bg-white/30 rounded" />
                </div>
                {/* Base */}
                <div className="w-24 h-3 bg-gray-500 rounded-b-xl mt-0 mx-auto" />
              </div>
            </div>

            <div className="relative z-10">
              <h2 className="text-white font-bold text-2xl sm:text-3xl leading-snug">Print at Kiosk</h2>
              <p className="text-gray-300 text-sm mt-1">Scan / Locate</p>
            </div>

            <div className="relative z-10 mt-8">
              <div
                className="inline-flex items-center gap-2 bg-white hover:bg-white/90 active:bg-white/80 text-gray-900 font-bold text-sm rounded-full px-5 py-2.5 transition-colors shadow-md"
              >
                Print Now
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>

        {/* Delivery Promo Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-600 p-5 min-h-[120px]">
          {/* Scooter illustration placeholder */}
          <div className="absolute right-4 bottom-4 w-20 h-16 flex items-end justify-center opacity-70">
            <div className="relative">
              <div className="w-14 h-8 bg-cyan-400 rounded-lg" />
              <div className="absolute -top-4 right-1 w-8 h-8 rounded-full bg-gray-400 border-2 border-white/50" />
            </div>
          </div>
          <div className="relative z-10 max-w-[55%]">
            <h3 className="text-white font-bold text-base leading-snug">
              Get your Prints Delivered to your Doorstep
            </h3>
            <p className="text-gray-300 text-xs mt-1">(Coming Soon)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
