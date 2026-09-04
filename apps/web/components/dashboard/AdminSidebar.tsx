"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Printer,
  Wallet,
  Store,
  MailPlus,
  ShieldCheck,
  LogOut,
  ChevronDown,
  X,
  Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type AdminSection =
  | "overview"
  | "analytics"
  | "payouts"
  | "bankVerifications"
  | "vendors"
  | "printers"
  | "shops"
  | "invites";

interface AdminSidebarProps {
  active: AdminSection;
  onSelect: (section: AdminSection) => void;
  email: string | null;
  pendingPayouts?: number;
  pendingBankVerifications?: number;
}

const NAV_ITEMS: { id: AdminSection; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "analytics", label: "Platform analytics", icon: BarChart3 },
  { id: "payouts", label: "Payout requests", icon: Wallet },
  { id: "bankVerifications", label: "Bank verifications", icon: ShieldCheck },
  { id: "vendors", label: "Vendors", icon: Users },
  { id: "printers", label: "Printers", icon: Printer },
  { id: "shops", label: "Shops", icon: Store },
  { id: "invites", label: "Vendor invites", icon: MailPlus },
];

function NavItem({
  item,
  active,
  onSelect,
  badge,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  onSelect: () => void;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
        active
          ? "bg-indigo-600 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
            active ? "bg-white text-indigo-600" : "bg-amber-500 text-white"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function SidebarContent({
  active,
  onSelect,
  email,
  pendingPayouts,
  pendingBankVerifications,
  onNavClick,
}: AdminSidebarProps & { onNavClick?: () => void }) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-zinc-100">
      <div className="px-4 pt-6 pb-5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-zinc-900 tracking-tight">PrintBuddy</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md">
            Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label="Admin navigation">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={active === item.id}
            onSelect={() => {
              onSelect(item.id);
              onNavClick?.();
            }}
            badge={
              item.id === "payouts"
                ? pendingPayouts
                : item.id === "bankVerifications"
                  ? pendingBankVerifications
                  : undefined
            }
          />
        ))}
      </nav>

      <div className="px-3 pb-4 pt-2 shrink-0 border-t border-zinc-100">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-expanded={userMenuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-amber-700">
                {(email ?? "?")[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-zinc-900 truncate">Admin</p>
              <p className="text-xs text-zinc-500 truncate">{email ?? ""}</p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-zinc-100 rounded-xl shadow-lg overflow-hidden z-50">
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
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

export function AdminSidebar(props: AdminSidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen">
        <SidebarContent {...props} />
      </aside>

      <button
        onClick={() => setDrawerOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-xl bg-white border border-zinc-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5 text-zinc-700" />
      </button>

      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative h-full">
          <SidebarContent {...props} onNavClick={() => setDrawerOpen(false)} />
          <button
            onClick={() => setDrawerOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-100"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
      </aside>
    </>
  );
}
