"use client";

import React from "react";
import { Info } from "lucide-react";
import { QRScanner } from "@/components/QRScanner";

export default function ScanPage() {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Instruction banner — always visible above the camera */}
      <div
        role="note"
        className="mx-4 mt-3 flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3.5 py-2.5"
      >
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" aria-hidden />
        <div className="text-xs leading-snug">
          <span className="font-semibold">Scan one QR code at a time.</span>{" "}
          Only one person can scan the QR code.
        </div>
      </div>

      <QRScanner />
    </div>
  );
}
