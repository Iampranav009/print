"use client";

import React, { useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";

interface KioskQRProps {
  shopId: string;
  shopName: string;
  location?: string | null;
}

function getOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function subscribe() {
  return () => {};
}

export function KioskQR({ shopId, shopName, location }: KioskQRProps) {
  const origin = useSyncExternalStore(subscribe, getOrigin, () => "");
  const qrUrl = origin ? `${origin}/s/${shopId}` : `https://printbuddy.app/s/${shopId}`;

  return (
    <div className="flex flex-col items-center justify-center text-center select-none w-full max-w-md mx-auto">
      {/* Shop Logo & Name */}
      <div className="w-[72px] h-[72px] rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/20 mb-4">
        🖨️
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight leading-snug">
        {shopName}
      </h1>
      {location && (
        <p className="text-lg text-zinc-400 mt-1 max-w-sm truncate">
          {location}
        </p>
      )}

      {/* QR Code Container */}
      <div className="mt-8 bg-white p-6 rounded-3xl shadow-2xl flex items-center justify-center">
        <QRCodeSVG
          value={qrUrl}
          size={340}
          level="M"
          marginSize={0}
          bgColor="#FFFFFF"
          fgColor="#000000"
          className="rounded-xl"
        />
      </div>

      {/* Taglines */}
      <div className="mt-8 space-y-1">
        <p className="text-xl font-medium text-zinc-200 tracking-wide">
          Scan to print
        </p>
        <p className="text-sm text-zinc-400">
          Scan with your phone camera or the PrintBuddy app
        </p>
      </div>
    </div>
  );
}
