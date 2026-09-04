"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Printer, ScanLine, Clock, User } from "lucide-react";

interface TabItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const TABS: TabItem[] = [
  { name: "Print", href: "/app/print", icon: Printer },
  { name: "Scan", href: "/app/scan", icon: ScanLine },
  { name: "History", href: "/app/history", icon: Clock },
  { name: "Profile", href: "/app/profile", icon: User },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-zinc-100 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]"
      style={{
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href === "/app/history" && pathname.startsWith("/app/history/")) ||
            (tab.href === "/app/print" && pathname.startsWith("/app/print"));

          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              style={{ touchAction: "manipulation" }}
              aria-current={isActive ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center relative py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl transition-colors ${
                isActive ? "text-indigo-600" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {/* 3px active dot centered above icon */}
              <div
                className={`w-[3px] h-[3px] rounded-full mb-1 transition-all ${
                  isActive ? "bg-indigo-600 opacity-100 scale-100" : "opacity-0 scale-50"
                }`}
                aria-hidden={true}
              />
              <Icon
                className={`w-6 h-6 transition-colors ${
                  isActive ? "text-indigo-600" : "text-zinc-400"
                }`}
                aria-hidden={true}
              />
              <span
                className={`text-[11px] mt-1 transition-colors leading-none ${
                  isActive ? "font-semibold text-indigo-600" : "font-normal text-zinc-500"
                }`}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
