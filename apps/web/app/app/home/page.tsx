"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Printer,
  QrCode,
  ChevronRight,
  Upload,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Truck,
} from "lucide-react";

export default function HomePage() {
  const [userName, setUserName] = useState<string>("");
  const [userInitial, setUserInitial] = useState<string>("U");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email ? user.email.split("@")[0] : "");
          if (fullName) {
            // Take the first name or full name
            const firstName = fullName.split(" ")[0];
            setUserName(firstName);
            setUserInitial(firstName.charAt(0).toUpperCase());
          }
          const avatar =
            user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
          setAvatarUrl(avatar);
        }
      });
    } catch {
      // Fallback for SSR or offline mode
    }
  }, []);

  return (
    <div className="min-h-full bg-[#fbfdfb] pb-28">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#0C831F] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0C831F] animate-pulse" />
              PrintBuddy
            </p>
            <h1 className="text-xl font-bold text-gray-900 mt-0.5 capitalize">
              Good morning {userName ? userName : "there"} 👋
            </h1>
          </div>

          {/* User Avatar */}
          <Link
            href="/app/profile"
            style={{ touchAction: "manipulation" }}
            aria-label="View Profile"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C831F] rounded-full"
          >
            <div className="w-10 h-10 rounded-full bg-[#e7f6ea] border-2 border-[#0C831F]/30 flex items-center justify-center relative overflow-hidden shadow-sm hover:scale-105 transition-transform">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={userName || "Profile"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-[#0C831F] font-bold text-base">
                  {userInitial}
                </span>
              )}
            </div>
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* Expanded Big "Print Now" Hero Box */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0C831F] via-[#0b741c] to-[#075313] p-6 shadow-xl shadow-[#0C831F]/20 text-white border border-[#0C831F]/40">
          {/* Subtle decorative background circles */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 blur-2xl -translate-y-12 translate-x-12 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-black/10 blur-xl translate-y-8 -translate-x-8 pointer-events-none" />
          <div className="absolute right-3 top-4 w-28 h-28 rounded-full border border-white/10 pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wide mb-4">
            <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
            <span>Instant Self-Serve Print</span>
          </div>

          {/* Title & Description */}
          <div className="relative z-10">
            <h2 className="text-2xl font-black tracking-tight leading-tight">
              Print at Kiosk
            </h2>
            <p className="text-white/90 text-sm mt-1.5 leading-relaxed max-w-[90%]">
              Upload your document, lock live price, and get your printout in seconds.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-2.5 my-5 relative z-10">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
              <Sparkles className="w-4 h-4 text-yellow-300 flex-shrink-0" />
              <span className="text-xs font-medium text-white/95">Color &amp; B/W</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="text-xs font-medium text-white/95">Auto-Deleted</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2.5 relative z-10 pt-1">
            {/* Primary Big Print Now CTA */}
            <Link
              href="/app/print"
              style={{ touchAction: "manipulation" }}
              aria-label="Print Document Now"
              className="w-full min-h-[54px] flex items-center justify-between px-5 bg-white hover:bg-white/95 active:bg-white/90 text-[#0C831F] font-bold text-base rounded-2xl shadow-lg transition-all transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-[#0C831F]" />
                <span>Print Now</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#e7f6ea] flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-[#0C831F]" />
              </div>
            </Link>

            {/* Scan QR Code button */}
            <Link
              href="/app/scan"
              style={{ touchAction: "manipulation" }}
              aria-label="Scan Kiosk QR Code"
              className="w-full min-h-[46px] flex items-center justify-center gap-2 px-4 bg-white/15 hover:bg-white/20 active:bg-white/25 text-white font-semibold text-sm rounded-xl border border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <QrCode className="w-4 h-4 text-white" />
              <span>Scan Kiosk QR to Link Printer</span>
            </Link>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">
              How PrintBuddy Works
            </h3>
            <span className="text-[11px] font-semibold text-[#0C831F] bg-[#e7f6ea] px-2.5 py-0.5 rounded-full">
              3 Simple Steps
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Step 1 */}
            <div className="bg-[#f8fdf9] border border-[#e7f6ea] rounded-2xl p-3 flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-[#e7f6ea] text-[#0C831F] flex items-center justify-center mb-2 shadow-xs">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-bold text-gray-900">1. Upload</p>
              <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">
                PDF, Word &amp; Images
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#f8fdf9] border border-[#e7f6ea] rounded-2xl p-3 flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-[#e7f6ea] text-[#0C831F] flex items-center justify-center mb-2 shadow-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-bold text-gray-900">2. Pay UPI</p>
              <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">
                Exact locked price
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#f8fdf9] border border-[#e7f6ea] rounded-2xl p-3 flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-[#e7f6ea] text-[#0C831F] flex items-center justify-center mb-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-bold text-gray-900">3. Release</p>
              <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">
                Instant 4-digit code
              </p>
            </div>
          </div>
        </div>

        {/* Doorstep Delivery Promo Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gray-900 p-5 text-white shadow-md border border-gray-800">
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="max-w-[70%]">
              <div className="inline-flex items-center gap-1 bg-yellow-400 text-gray-950 text-[10px] font-extrabold px-2 py-0.5 rounded-md mb-2 uppercase tracking-wide">
                Coming Soon
              </div>
              <h3 className="text-base font-bold leading-snug">
                Doorstep Print Delivery
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Get documents printed &amp; delivered to your home or office in minutes.
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-[#0C831F] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#0C831F]/30">
              <Truck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
