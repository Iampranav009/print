"use client";

import React from "react";
import { QRScanner } from "@/components/QRScanner";

export default function ScanPage() {
  return (
    <div className="w-full h-dvh min-h-dvh flex flex-col bg-black overflow-hidden">
      <QRScanner />
    </div>
  );
}
