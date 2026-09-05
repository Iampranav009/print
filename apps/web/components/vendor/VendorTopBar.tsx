"use client";

import { usePathname } from "next/navigation";
import { PrinterStatusPill } from "./PrinterStatusPill";
import { WalletChip } from "./WalletChip";

interface ShopBadgeProps {
  shopName: string | null;
  shopStatus: string | null;
}

const PAGE_TITLES: Record<string, string> = {
  "/vendor": "Overview",
  "/vendor/analytics": "Analytics",
  "/vendor/payouts": "Wallet",
  "/vendor/shop": "Shop",
  "/vendor/printer": "Printer",
  "/vendor/location": "Printer Location",
  "/vendor/bank": "Bank Details",
  "/vendor/profile": "Profile",
  "/vendor/onboarding": "Onboarding",
};

function StatusDot({ status }: { status: string | null }) {
  const colorClass =
    status === "active"
      ? "bg-emerald-500"
      : status === "pending"
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <span
      className={`w-2 h-2 rounded-full ${colorClass} shrink-0`}
      aria-hidden="true"
    />
  );
}

export function VendorTopBar({ shopName, shopStatus }: ShopBadgeProps) {
  const pathname = usePathname();

  // Find longest matching prefix
  const title =
    Object.entries(PAGE_TITLES)
      .filter(([path]) => pathname === path || pathname.startsWith(path + "/"))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "Partner Portal";

  return (
    <header className="h-16 flex items-center justify-between px-6 lg:px-8 bg-white border-b border-zinc-100 shrink-0">
      {/* Page title — leave space for hamburger on mobile */}
      <h1 className="text-base font-semibold text-zinc-900 ml-12 lg:ml-0">{title}</h1>

      {/* Right side items */}
      <div className="flex items-center gap-3">
        <WalletChip />
        <PrinterStatusPill isLink={true} />

        {shopName && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-100">
            <StatusDot status={shopStatus} />
            <span className="text-sm font-medium text-zinc-700 max-w-[160px] truncate">
              {shopName}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
