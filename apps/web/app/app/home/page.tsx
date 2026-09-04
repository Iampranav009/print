"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Printer, FileText, Stamp, Truck, ChevronRight, BookOpen } from "lucide-react";
import { formatRelativeTime } from "@/lib/date-utils";

// Demo library documents (will come from API when wired up)
const DEMO_DOCS: Array<{
  id: string;
  name: string;
  pages: number;
  date: string;
  size: string;
}> = [];

export default function HomePage() {
  const [libraryTab, setLibraryTab] = useState<"Documents" | "e-Stamps">("Documents");

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

      <div className="px-4 space-y-3">
        {/* Hero Banner — Print at Kiosk */}
        <Link
          href="/app/scan"
          style={{ touchAction: "manipulation" }}
          aria-label="Scan a printer QR code to start"
          className="block"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 p-5 min-h-[140px]">
            {/* Background decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 right-8 w-20 h-20 rounded-full bg-white/5 translate-y-6" />

            {/* Kiosk illustration placeholder */}
            <div className="absolute right-4 bottom-4 w-20 h-24 flex items-end justify-center opacity-80">
              <div className="relative">
                {/* Kiosk body */}
                <div className="w-14 h-16 bg-gray-600 rounded-lg border border-gray-500 flex flex-col items-center justify-start pt-1.5 gap-1">
                  <div className="w-10 h-7 bg-blue-500 rounded-sm flex items-center justify-center">
                    <Printer className="w-4 h-4 text-white" />
                  </div>
                  <div className="w-8 h-0.5 bg-white/30 rounded" />
                  <div className="w-8 h-0.5 bg-white/30 rounded" />
                </div>
                {/* Base */}
                <div className="w-16 h-2 bg-gray-500 rounded-b-lg mt-0 mx-auto" />
              </div>
            </div>

            <div className="relative z-10">
              <h2 className="text-white font-bold text-xl leading-snug">Print at Kiosk</h2>
              <p className="text-gray-300 text-xs mt-0.5">Scan / Locate</p>
              <div
                className="mt-4 inline-flex items-center gap-1.5 bg-white/90 hover:bg-white active:bg-white/80 text-gray-900 font-semibold text-sm rounded-full px-4 py-2 transition-colors"
              >
                Print Now
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>

        {/* Service Cards Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Create Agreements */}
          <div className="relative overflow-hidden rounded-2xl bg-cyan-400 p-4 min-h-[140px] cursor-pointer active:opacity-90">
            <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full bg-white/10 translate-x-4 translate-y-4" />
            <div className="mt-10">
              <h3 className="text-white font-bold text-base leading-tight">Create<br />Agreements</h3>
              <p className="text-white/80 text-[11px] mt-1 font-medium">Instant &amp; Ready</p>
            </div>
          </div>

          {/* Buy e-Stamp */}
          <div className="relative overflow-hidden rounded-2xl bg-gray-600 p-4 min-h-[140px] cursor-pointer active:opacity-90">
            <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Stamp className="w-5 h-5 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full bg-white/10 translate-x-4 translate-y-4" />
            <div className="mt-10">
              <h3 className="text-white font-bold text-base leading-tight">Buy e-Stamp</h3>
              <p className="text-white/80 text-[11px] mt-1 font-medium">Quick &amp; Easy</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

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

        {/* Library Section */}
        <div className="pt-1">
          <h2 className="text-gray-900 font-bold text-lg mb-3">Library</h2>

          {/* Tab pills */}
          <div className="flex gap-2 mb-4">
            {(["Documents", "e-Stamps"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLibraryTab(tab)}
                style={{ touchAction: "manipulation" }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                  libraryTab === tab
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Library Content */}
          {DEMO_DOCS.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No {libraryTab.toLowerCase()} found</p>
              <p className="text-gray-400 text-xs mt-1">Your saved documents will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {DEMO_DOCS.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.pages} pages · {formatRelativeTime(doc.date)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
