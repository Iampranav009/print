"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, BookOpen, User } from "lucide-react";

interface TabItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const TABS: TabItem[] = [
  { name: "Home", href: "/app/home", icon: Home },
  { name: "Nearby", href: "/app/nearby", icon: MapPin },
  { name: "Library", href: "/app/history", icon: BookOpen },
  { name: "Profile", href: "/app/profile", icon: User },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-lg mx-auto flex items-stretch justify-around h-16 px-1">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href === "/app/history" && (pathname.startsWith("/app/history") || pathname === "/app/history")) ||
            (tab.href === "/app/home" && pathname === "/app");

          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              style={{ touchAction: "manipulation" }}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.name}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C831F] rounded-xl transition-colors ${
                isActive ? "text-[#0C831F]" : "text-gray-400"
              }`}
            >
              <div className={`w-1 h-1 rounded-full mb-0.5 transition-all ${
                isActive ? "bg-[#0C831F]" : "opacity-0"
              }`} aria-hidden />
              <Icon className="w-5 h-5" aria-hidden />
              <span className={`text-[10px] font-medium leading-none ${
                isActive ? "text-[#0C831F] font-semibold" : "text-gray-500"
              }`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
