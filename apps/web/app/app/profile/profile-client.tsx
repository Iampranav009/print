"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ChevronRight, User, AlertTriangle, Loader2, Bell, CreditCard } from "lucide-react";

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

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: () => void; id: string }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={onChange}
      style={{ touchAction: "manipulation" }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
        checked ? "bg-green-500" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function ProfileClient({ user, stats }: ProfileProps) {
  const router = useRouter();
  const [emailNotif, setEmailNotif] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

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
    <div className="min-h-full bg-white pb-28">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* User Card */}
      <div className="mx-4 mt-2 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/20 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.fullName || "Profile"}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <User className="w-8 h-8 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-base truncate">
            {user.fullName || "PrintBuddy Customer"}
          </h2>
          {user.email && (
            <p className="text-white/80 text-xs mt-0.5 truncate">{user.email}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
        <div className="bg-yellow-50 rounded-2xl p-3.5 text-center border border-yellow-100">
          <p className="text-lg font-bold text-gray-900 tabular-nums">{stats.totalPrints}</p>
          <p className="text-[10px] font-semibold text-yellow-700 uppercase tracking-wider mt-0.5">Prints</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-3.5 text-center border border-green-100">
          <p className="text-sm font-bold text-gray-900 tabular-nums truncate">{formatPaise(stats.totalSpentPaise)}</p>
          <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider mt-0.5">Spent</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-3.5 text-center border border-gray-100">
          <p className="text-sm font-bold text-gray-900 truncate mt-1">{stats.favoriteShop || "—"}</p>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">Fav Shop</p>
        </div>
      </div>

      {/* Preferences */}
      <div className="mx-4 mt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Preferences</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4">
          {/* Email notifications */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-yellow-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">Email notifications</span>
            </div>
            <Toggle checked={emailNotif} onChange={() => setEmailNotif((v) => !v)} id="email-notif" />
          </div>

          {/* Marketing */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-yellow-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">Marketing emails</span>
            </div>
            <Toggle checked={marketing} onChange={() => setMarketing((v) => !v)} id="marketing-notif" />
          </div>

          {/* Payment methods */}
          <button
            type="button"
            onClick={() => alert("Saved payment methods are managed via Razorpay during checkout.")}
            style={{ touchAction: "manipulation" }}
            className="w-full flex items-center justify-between py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-b-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">Payment methods</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Account section */}
      <div className="mx-4 mt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Account</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{ touchAction: "manipulation" }}
            className="w-full min-h-[48px] bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-medium text-sm rounded-xl transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            {signingOut ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : "Sign out"}
          </button>

          {!showDelete ? (
            <button
              type="button"
              onClick={() => setShowDelete(true)}
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
              <p>This will delete your PrintBuddy account data permanently.</p>
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
                  onClick={() => setShowDelete(false)}
                  style={{ touchAction: "manipulation" }}
                  className="min-h-[38px] px-3.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium text-xs hover:bg-gray-50 transition-colors"
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
