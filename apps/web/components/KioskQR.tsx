"use client";

import React, { useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";

interface KioskQRProps {
  shopId: string;
  shopName: string;
  location?: string | null;
  compact?: boolean; // renders smaller when a session is active on the right
}

function getOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function subscribe() {
  return () => {};
}

export function KioskQR({ shopId, shopName, location, compact }: KioskQRProps) {
  const origin = useSyncExternalStore(subscribe, getOrigin, () => "");
  const qrUrl = origin ? `${origin}/s/${shopId}` : `https://printbuddy.app/s/${shopId}`;

  const size = compact ? 220 : 320;

  return (
    <div className="flex flex-col items-center justify-center text-center select-none w-full max-w-md mx-auto">
      {/* Shop badge */}
      <div className="flex items-center gap-3 mb-7">
        <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center shadow-[0_8px_24px_rgba(12,131,31,0.18)]">
          <Printer className="w-6 h-6 text-white" />
        </div>
        <div className="text-left">
          <h1 className="text-xl font-bold text-zinc-900 leading-tight">
            {shopName}
          </h1>
          {location && (
            <p className="text-sm text-zinc-500 truncate max-w-[220px]">{location}</p>
          )}
        </div>
      </div>

      {/* QR — clean, no heavy shadow, plain border to sit well on white */}
      <div className="bg-white p-6 rounded-[2rem] border border-black/[0.08] shadow-[0_18px_55px_rgba(0,0,0,0.07)] flex items-center justify-center">
        <QRCodeSVG
          value={qrUrl}
          size={size}
          level="M"
          marginSize={0}
          bgColor="#FFFFFF"
          fgColor="#1D1D1F"
        />
      </div>

      {/* Taglines */}
      <div className="mt-7 space-y-1.5">
        <p className="text-lg font-semibold text-zinc-900 tracking-tight">
          Scan to print
        </p>
        <p className="text-sm text-zinc-500">
          Use your phone camera or the PrintBuddy app
        </p>
      </div>
    </div>
  );
}
