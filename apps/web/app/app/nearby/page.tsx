"use client";

import React from "react";
import { MapPin } from "lucide-react";

export default function NearbyPage() {
  return (
    <div className="min-h-full bg-white flex flex-col items-center justify-center px-4 pb-24">
      <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
        <MapPin className="w-8 h-8 text-green-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Nearby Printers</h2>
      <p className="text-gray-500 text-sm text-center max-w-xs">
        Find print shops near you. This feature is coming soon.
      </p>
    </div>
  );
}
