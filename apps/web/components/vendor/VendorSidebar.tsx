"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Store,
  Printer,
  MapPin,
  Landmark,
  User,
  LogOut,
  ChevronDown,
  X,
  Menu,
  Wallet,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface VendorSidebarProps {
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
  payoutsUnlocked: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  requiresBankVerified?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/vendor", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/vendor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/vendor/shop", label: "Shop", icon: Store },
  { href: "/vendor/printer", label: "Printer", icon: Printer },
  { href: "/vendor/location", label: "Printer location", icon: MapPin },
  { href: "/vendor/bank", label: "Bank details", icon: Landmark },
  { href: "/vendor/payouts", label: "Request payout", icon: Wallet, requiresBankVerified: true },
  { href: "/vendor/profile", label: "Profile", icon: User },
];

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
  onClick,
  locked,
  lockedTooltip,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  onClick?: () => void;
  locked?: boolean;
  lockedTooltip?: string;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  if (locked) {
    return (
      <div
        aria-disabled="true"
        title={lockedTooltip}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 cursor-not-allowed select-none"
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{label}</span>
        <Lock className="w-3.5 h-3.5 shrink-0" aria-label="Locked" />
      </div>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
        isActive
          ? "bg-indigo-600 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </Link>
  );
}

function SidebarContent({
  userName,
  userEmail,
  userAvatar,
  payoutsUnlocked,
  onNavClick,
}: VendorSidebarProps & { onNavClick?: () => void }) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/vendor/login");
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-zinc-100">
      {/* Wordmark */}
      <div className="px-4 pt-6 pb-5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-zinc-900 tracking-tight">PrintBuddy</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md">
            Seller
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-contain" aria-label="Vendor navigation">
        {NAV_ITEMS.map((item) => {
          const locked = !!item.requiresBankVerified && !payoutsUnlocked;
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              exact={item.exact}
              onClick={onNavClick}
              locked={locked}
              lockedTooltip={
                locked ? "Unlocks once the admin verifies your bank details" : undefined
              }
            />
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 pt-2 shrink-0 border-t border-zinc-100">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="User menu"
            aria-expanded={userMenuOpen}
          >
            {userAvatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={userAvatar}
                alt={userName ?? "User avatar"}
                className="w-8 h-8 rounded-full shrink-0 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-indigo-600">
                  {(userName ?? userEmail ?? "?")[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-zinc-900 truncate">{userName ?? "Vendor"}</p>
              <p className="text-xs text-zinc-500 truncate">{userEmail ?? ""}</p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-zinc-100 rounded-xl shadow-lg overflow-hidden z-50">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function VendorSidebar(props: VendorSidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen self-start z-30">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-xl bg-white border border-zinc-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5 text-zinc-700" />
      </button>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
      >
        <div className="relative h-full">
          <SidebarContent {...props} onNavClick={() => setDrawerOpen(false)} />
          <button
            onClick={() => setDrawerOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
      </aside>
    </>
  );
}
