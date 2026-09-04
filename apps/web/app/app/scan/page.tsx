"use client";

import React from "react";
import { QRScanner } from "@/components/QRScanner";

export default function ScanPage() {
  return (
    <div className="w-full h-full flex flex-col">
      <QRScanner />
    </div>
  );
}
