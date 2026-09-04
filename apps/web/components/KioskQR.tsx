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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-sm">
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
      <div className="bg-white p-5 rounded-3xl border border-zinc-200 flex items-center justify-center">
        <QRCodeSVG
          value={qrUrl}
          size={size}
          level="M"
          marginSize={0}
          bgColor="#FFFFFF"
          fgColor="#0F172A"
        />
      </div>

      {/* Taglines */}
      <div className="mt-6 space-y-1">
        <p className="text-base font-semibold text-zinc-900 tracking-tight">
          Scan to print
        </p>
        <p className="text-sm text-zinc-500">
          Use your phone camera or the PrintBuddy app
        </p>
      </div>
    </div>
  );
}
