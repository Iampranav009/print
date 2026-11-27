"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, Clock, User } from "lucide-react";

interface TabItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
}

const TABS: TabItem[] = [
  { name: "Home", href: "/app/home", icon: Home },
  { name: "Nearby", href: "/app/nearby", icon: MapPin },
  { name: "History", href: "/app/history", icon: Clock },
  { name: "Profile", href: "/app/profile", icon: User },
];

function activeIndex(pathname: string) {
  if (pathname === "/app") return 0;
  return TABS.findIndex((t) => pathname === t.href || pathname.startsWith(`${t.href}/`));
}

export function TabBar() {
  const pathname = usePathname();

  if (pathname === "/app/scan" || pathname === "/app/print") return null;

  const current = activeIndex(pathname);

  return (
    <nav
      aria-label="Bottom Navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="glass-chrome pointer-events-auto relative mx-auto grid h-16 max-w-md grid-cols-4 rounded-full p-1.5">
        {/* Sliding active indicator */}
        {current >= 0 && (
          <span
            aria-hidden
            className="absolute bottom-1.5 left-1.5 top-1.5 rounded-full bg-tint/10 ring-1 ring-tint/15 transition-transform duration-500 ease-spring"
            style={{
              width: "calc((100% - 12px) / 4)",
              transform: `translateX(${current * 100}%)`,
            }}
          />
        )}

        {TABS.map((tab, i) => {
          const isActive = i === current;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              style={{ touchAction: "manipulation" }}
              aria-current={isActive ? "page" : undefined}
              className={`relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint ${
                isActive ? "text-tint" : "text-zinc-500"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 1.9} aria-hidden />
              <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : "font-medium"}`}>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
