"use client";

import { useState, useEffect } from "react";
import { AdminSidebar, type AdminSection } from "./AdminSidebar";
import { AdminSections } from "./AdminSections";
import { AdminAnalytics } from "./AdminAnalytics";
import { AdminPayouts } from "./AdminPayouts";
import { AdminVendors } from "./AdminVendors";
import { AdminPrinters } from "./AdminPrinters";
import { AdminBankVerifications } from "./AdminBankVerifications";
import { DashboardClient } from "@/app/dashboard/DashboardClient";

interface Props {
  adminEmail: string | null;
}

const STORAGE_KEY = "printbuddy_admin_section";

const SECTION_TITLES: Record<AdminSection, string> = {
  overview: "Overview",
  analytics: "Platform analytics",
  payouts: "Payout requests",
  bankVerifications: "Bank verifications",
  vendors: "Vendors",
  printers: "Printers",
  shops: "Shops",
  invites: "Vendor invites",
};

const VALID_SECTIONS: AdminSection[] = [
  "overview",
  "analytics",
  "payouts",
  "bankVerifications",
  "vendors",
  "printers",
  "shops",
  "invites",
];

function readInitialSection(): AdminSection {
  if (typeof window === "undefined") return "overview";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (VALID_SECTIONS as string[]).includes(stored)) {
      return stored as AdminSection;
    }
  } catch {
    // ignore
  }
  return "overview";
}

export function AdminDashboardShell({ adminEmail }: Props) {
  const [section, setSection] = useState<AdminSection>(readInitialSection);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [pendingBankVerifications, setPendingBankVerifications] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, section);
    } catch {
      // ignore
    }
  }, [section]);

  // Poll pending counts so sidebar badges stay fresh across tabs.
  useEffect(() => {
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const [payoutsRes, banksRes] = await Promise.all([
          fetch("/api/admin/payouts?status=pending"),
          fetch("/api/admin/vendors/bank"),
        ]);
        if (!cancelled && payoutsRes.ok) {
          const data = await payoutsRes.json();
          setPendingPayouts((data.requests ?? []).length);
        }
        if (!cancelled && banksRes.ok) {
          const data = await banksRes.json();
          setPendingBankVerifications((data.banks ?? []).filter((b: { verified: boolean }) => !b.verified).length);
        }
      } catch {
        // ignore
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen flex bg-zinc-50">
      <AdminSidebar
        active={section}
        onSelect={setSection}
        email={adminEmail}
        pendingPayouts={pendingPayouts}
        pendingBankVerifications={pendingBankVerifications}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 lg:px-8 bg-white border-b border-zinc-100 shrink-0">
          <h1 className="text-base font-semibold text-zinc-900 ml-12 lg:ml-0">{SECTION_TITLES[section]}</h1>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Admin Portal
          </span>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {section === "overview" && <DashboardClient />}
            {section === "analytics" && <AdminAnalytics />}
            {section === "payouts" && <AdminPayouts onCountChange={setPendingPayouts} />}
            {section === "bankVerifications" && (
              <AdminBankVerifications onCountChange={setPendingBankVerifications} />
            )}
            {section === "vendors" && <AdminVendors />}
            {section === "printers" && <AdminPrinters />}
            {section === "shops" && <AdminSections showShopsOnly />}
            {section === "invites" && <AdminSections showInvitesOnly />}
          </div>
        </main>
      </div>
    </div>
  );
}
