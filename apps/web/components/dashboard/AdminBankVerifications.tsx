"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ShieldCheck, ShieldAlert, Landmark, User, Phone, Store, MapPin, AlertCircle } from "lucide-react";

interface BankRow {
  shop_id: string;
  shop_name: string;
  shop_location: string | null;
  vendor_name: string | null;
  vendor_phone: string | null;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string | null;
  branch: string | null;
  upi_id: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  onCountChange?: (pending: number) => void;
}

export function AdminBankVerifications({ onCountChange }: Props) {
  const [rows, setRows] = useState<BankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "verified" | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/vendors/bank");
      if (res.ok) {
        const data = await res.json();
        setRows(data.banks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (onCountChange) {
      const pending = rows.filter((r) => !r.verified).length;
      onCountChange(pending);
    }
  }, [rows, onCountChange]);

  const setVerified = async (shopId: string, verified: boolean) => {
    setBusy(shopId);
    setError(null);
    try {
      const res = await fetch("/api/admin/vendors/bank", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: shopId, verified }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update");
      }
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const visible = rows.filter((r) => {
    if (filter === "pending") return !r.verified;
    if (filter === "verified") return r.verified;
    return true;
  });

  const pendingCount = rows.filter((r) => !r.verified).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Bank verifications</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Review vendor bank details before enabling their payouts.
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-700 font-semibold">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-zinc-100">
          {(["pending", "verified", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-500">
            {filter === "pending"
              ? "No pending bank verifications — you're all caught up."
              : filter === "verified"
                ? "No verified bank records yet."
                : "No vendors have submitted bank details yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((r) => (
            <div key={r.shop_id} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Store className="w-4 h-4 text-zinc-400 shrink-0" />
                    <p className="font-semibold text-zinc-900 truncate">{r.shop_name}</p>
                  </div>
                  {r.shop_location && (
                    <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{r.shop_location}</span>
                    </p>
                  )}
                </div>
                {r.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 shrink-0">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Pending
                  </span>
                )}
              </div>

              {/* Vendor contact */}
              {(r.vendor_name || r.vendor_phone) && (
                <div className="text-xs text-zinc-600 space-y-1">
                  {r.vendor_name && (
                    <p className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-zinc-400" />
                      {r.vendor_name}
                    </p>
                  )}
                  {r.vendor_phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      {r.vendor_phone}
                    </p>
                  )}
                </div>
              )}

              {/* Bank details table */}
              <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4 text-sm space-y-2">
                <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5">
                  <span className="text-zinc-500 text-xs">Holder</span>
                  <span className="font-medium text-zinc-900">{r.account_holder_name}</span>
                  <span className="text-zinc-500 text-xs">Account</span>
                  <span className="font-mono text-zinc-900 tabular-nums select-all">{r.account_number}</span>
                  <span className="text-zinc-500 text-xs">IFSC</span>
                  <span className="font-mono text-zinc-900 tracking-wider select-all">{r.ifsc_code}</span>
                  {r.bank_name && (
                    <>
                      <span className="text-zinc-500 text-xs">Bank</span>
                      <span className="text-zinc-900">{r.bank_name}</span>
                    </>
                  )}
                  {r.branch && (
                    <>
                      <span className="text-zinc-500 text-xs">Branch</span>
                      <span className="text-zinc-900">{r.branch}</span>
                    </>
                  )}
                  {r.upi_id && (
                    <>
                      <span className="text-zinc-500 text-xs">UPI</span>
                      <span className="font-mono text-zinc-900 select-all">{r.upi_id}</span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-zinc-400">
                {r.verified ? "Verified" : "Submitted"} {new Date(r.updated_at).toLocaleString("en-IN")}
              </p>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {r.verified ? (
                  <button
                    onClick={() => setVerified(r.shop_id, false)}
                    disabled={busy === r.shop_id}
                    className="px-3.5 py-1.5 rounded-xl border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {busy === r.shop_id ? "Working…" : "Revoke verification"}
                  </button>
                ) : (
                  <button
                    onClick={() => setVerified(r.shop_id, true)}
                    disabled={busy === r.shop_id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {busy === r.shop_id ? "Verifying…" : "Verify bank details"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
