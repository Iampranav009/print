"use client";

import React from "react";
import { usePathname } from "next/navigation";

export function AppTopBar() {
  const pathname = usePathname();

  let title = "PrintBuddy";
  if (pathname.startsWith("/app/print")) {
    title = "Print";
  } else if (pathname.startsWith("/app/scan")) {
    title = "Scan";
  } else if (pathname === "/app/history") {
    title = "History";
  } else if (pathname.startsWith("/app/history/")) {
    title = "Order Status";
  } else if (pathname.startsWith("/app/profile")) {
    title = "Profile";
  }

  return (
    <header className="h-12 border-b border-zinc-100 flex items-center justify-center bg-white sticky top-0 z-30 flex-shrink-0 select-none">
      <h1 className="text-sm font-semibold text-zinc-900 tracking-tight">
        {title}
      </h1>
    </header>
  );
}
