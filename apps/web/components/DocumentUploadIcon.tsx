// Shared "file being uploaded" icon — a light-blue document with a small
// blue circle badge in the top-center carrying an Upload arrow. Used by
// both the mobile UploadProgressSheet and the kiosk KioskStatus so the
// brand is visually identical on phone + kiosk.

import React from "react";
import { Upload } from "lucide-react";

interface DocumentUploadIconProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { doc: "w-16 h-20", pad: "pb-3 gap-1", bar: "w-10 h-1.5", barShort: "w-7 h-1.5", badge: "w-8 h-8 -top-3", arrow: "w-4 h-4" },
  md: { doc: "w-24 h-32", pad: "pb-5 gap-1.5", bar: "w-14 h-2", barShort: "w-10 h-2", badge: "w-12 h-12 -top-4", arrow: "w-5 h-5" },
  lg: { doc: "w-40 h-52", pad: "pb-7 gap-2", bar: "w-24 h-3", barShort: "w-16 h-3", badge: "w-20 h-20 -top-6", arrow: "w-9 h-9" },
} as const;

export function DocumentUploadIcon({ size = "md", className = "" }: DocumentUploadIconProps) {
  const s = SIZES[size];
  return (
    <div className={`inline-flex items-center justify-center ${className}`} aria-hidden>
      <div className="relative">
        <div
          className={`${s.doc} bg-blue-100 rounded-lg border-2 border-blue-200 flex flex-col items-center justify-end ${s.pad}`}
        >
          <div className={`${s.bar} bg-blue-300 rounded`} />
          <div className={`${s.bar} bg-blue-300 rounded`} />
          <div className={`${s.barShort} bg-blue-300 rounded`} />
        </div>
        <div
          className={`absolute ${s.badge} left-1/2 -translate-x-1/2 rounded-full bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/30`}
        >
          <Upload className={`${s.arrow} text-white`} />
        </div>
      </div>
    </div>
  );
}
