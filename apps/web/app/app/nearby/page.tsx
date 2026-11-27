"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Printer } from "lucide-react";

const NearbyMap = dynamic(() => import("@/components/NearbyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-full pb-24 gap-4">
      <div className="w-14 h-14 rounded-[18px] bg-tint/10 flex items-center justify-center animate-pulse">
        <Printer className="w-7 h-7 text-tint" />
      </div>
      <p className="text-[14px] text-secondary-label font-medium">Loading nearby printers…</p>
    </div>
  ),
});

export default function NearbyPage() {
  return <NearbyMap />;
}
