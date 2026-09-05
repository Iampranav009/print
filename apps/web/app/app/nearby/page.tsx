"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Printer } from "lucide-react";

const NearbyMap = dynamic(() => import("@/components/NearbyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-full pb-24 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center animate-pulse">
        <Printer className="w-7 h-7 text-green-500" />
      </div>
      <p className="text-sm text-gray-400 font-medium">Loading nearby printers…</p>
    </div>
  ),
});

export default function NearbyPage() {
  return <NearbyMap />;
}
