"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";

interface WalletData {
  available_paise: number;
  can_withdraw: boolean;
  bank_verified: boolean;
}

function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function WalletChip() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    try {
      const res = await fetch("/api/vendor/wallet");
      if (res.ok) {
        const data = await res.json();
        setWallet(data);
      }
    } catch {
      // ignore — keep showing last known state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
    const interval = setInterval(fetchWallet, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 animate-pulse">
        <div className="w-3.5 h-3.5 rounded-full bg-zinc-300" />
        <div className="w-14 h-3 rounded bg-zinc-300" />
      </div>
    );
  }

  const amount = wallet?.available_paise ?? 0;
  const bankVerified = wallet?.bank_verified ?? false;

  return (
    <Link
      href="/vendor/payouts"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      title={bankVerified ? "View payouts" : "Add bank details to unlock payouts"}
    >
      <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span className="text-sm font-semibold text-emerald-700 tabular-nums">
        {formatINR(amount)}
      </span>
      {!bankVerified && (
        <span
          className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
          aria-label="Bank not verified"
        />
      )}
    </Link>
  );
}
