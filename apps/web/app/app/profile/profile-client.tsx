"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Toggle } from "@/components/Toggle";
import { ToggleRow } from "@/components/ToggleRow";
import { ChevronRight, User, AlertTriangle, Loader2 } from "lucide-react";

interface ProfileProps {
  user: {
    id: string;
    email?: string;
    fullName?: string;
    avatarUrl?: string;
  };
  stats: {
    totalPrints: number;
    totalSpentPaise: number;
    favoriteShop: string;
  };
}

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2)}`;
}

export function ProfileClient({ user, stats }: ProfileProps) {
  const router = useRouter();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-28">
      {/* User Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-100 border-2 border-white shadow-md flex items-center justify-center mb-3.5 relative">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.fullName || "Profile"}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <User className="w-10 h-10 text-zinc-400" />
          )}
        </div>
        <h2 className="text-xl font-semibold text-zinc-900">
          {user.fullName || "PrintBuddy Customer"}
        </h2>
        {user.email && (
          <p className="text-xs text-zinc-500 mt-0.5">{user.email}</p>
        )}
      </div>

      {/* Stats Row (3 tiles side-by-side) */}
      <div className="grid grid-cols-3 gap-3">
        {/* Total Prints */}
        <div className="bg-white rounded-2xl p-3.5 border border-zinc-100 shadow-sm text-center">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Prints
          </p>
          <p className="text-lg font-bold text-zinc-900 tabular-nums">
            {stats.totalPrints}
          </p>
        </div>

        {/* Total Spent */}
        <div className="bg-white rounded-2xl p-3.5 border border-zinc-100 shadow-sm text-center">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Total Spent
          </p>
          <p className="text-lg font-bold text-zinc-900 tabular-nums truncate">
            {formatPaise(stats.totalSpentPaise)}
          </p>
        </div>

        {/* Favourite Shop */}
        <div className="bg-white rounded-2xl p-3.5 border border-zinc-100 shadow-sm text-center">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Fav Shop
          </p>
          <p className="text-sm font-bold text-zinc-900 truncate mt-1">
            {stats.favoriteShop || "—"}
          </p>
        </div>
      </div>

      {/* Settings Section */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
          Preferences
        </p>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-4">
          <ToggleRow label="Email notifications" id="email-notif-label">
            <Toggle
              checked={emailNotifications}
              onChange={() => setEmailNotifications((v) => !v)}
              aria-labelledby="email-notif-label"
            />
          </ToggleRow>

          <ToggleRow label="Marketing emails" id="marketing-notif-label">
            <Toggle
              checked={marketingEmails}
              onChange={() => setMarketingEmails((v) => !v)}
              aria-labelledby="marketing-notif-label"
            />
          </ToggleRow>

          {/* Payment methods stub */}
          <button
            type="button"
            onClick={() => {
              alert("Saved payment methods are managed via Razorpay during checkout.");
            }}
            style={{ touchAction: "manipulation" }}
            className="w-full flex items-center justify-between py-4 text-sm font-medium text-zinc-900 hover:text-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <span>Payment methods</span>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-2 pt-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
          Account
        </p>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 space-y-3">
          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{ touchAction: "manipulation" }}
            className="w-full min-h-[48px] bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 font-medium text-sm rounded-xl transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          >
            {signingOut ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
            ) : (
              "Sign out"
            )}
          </button>

          {/* Delete Account Button */}
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ touchAction: "manipulation" }}
              className="w-full min-h-[48px] text-red-600 hover:bg-red-50 active:bg-red-100 font-medium text-sm rounded-xl transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Delete account
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 space-y-2.5">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Confirm account deletion?</span>
              </div>
              <p>
                This will delete your PrintBuddy account data permanently.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{ touchAction: "manipulation" }}
                  className="min-h-[38px] px-3.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-xs transition-colors"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ touchAction: "manipulation" }}
                  className="min-h-[38px] px-3.5 bg-white border border-zinc-200 text-zinc-700 rounded-lg font-medium text-xs hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
