"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, User, Store, Mail, Phone, CheckCircle2, XCircle, Search } from "lucide-react";

interface VendorRow {
  shop_id: string;
  shop_name: string;
  location: string | null;
  status: string;
  virtual_mode: boolean;
  owner_id: string;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  profile: { full_name: string; phone: string; address: string | null } | null;
  bank_verified: boolean;
  bank_name: string | null;
  has_bank: boolean;
  lifetime_revenue_paise: number;
  lifetime_prints: number;
}

function formatPaise(p: number): string {
  return `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AdminVendors() {
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/vendors");
      if (res.ok) {
        const data = await res.json();
        setRows(data.vendors ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      r.shop_name.toLowerCase().includes(needle) ||
      (r.location ?? "").toLowerCase().includes(needle) ||
      (r.profile?.full_name ?? "").toLowerCase().includes(needle) ||
      (r.contact_email ?? "").toLowerCase().includes(needle) ||
      (r.contact_phone ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Vendors</h2>
          <p className="text-sm text-zinc-500 mt-1">Every vendor who has claimed a shop.</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vendors…"
            className="pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 min-w-[240px]"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
            <User className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-500">
            {q ? "No vendors match this search." : "No vendors have claimed a shop yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <div key={v.shop_id} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-indigo-700">
                    {(v.profile?.full_name ?? v.shop_name)[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900 truncate">
                    {v.profile?.full_name ?? "Vendor"}
                  </p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    <span className="truncate">{v.shop_name}</span>
                  </p>
                </div>
                {v.virtual_mode && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 shrink-0">
                    Virtual
                  </span>
                )}
              </div>

              {v.location && <p className="text-xs text-zinc-500 truncate">{v.location}</p>}

              <div className="text-xs space-y-1 text-zinc-600">
                {v.contact_email && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span className="truncate">{v.contact_email}</span>
                  </p>
                )}
                {(v.contact_phone || v.profile?.phone) && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                    {v.contact_phone ?? v.profile?.phone}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium">Prints</p>
                  <p className="text-sm font-bold text-zinc-900 tabular-nums">
                    {v.lifetime_prints.toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium">Revenue</p>
                  <p className="text-sm font-bold text-zinc-900 tabular-nums">
                    {formatPaise(v.lifetime_revenue_paise)}
                  </p>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs">
                {v.has_bank ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Bank {v.bank_verified ? "verified" : "unverified"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <XCircle className="w-3.5 h-3.5" />
                    No bank details
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    v.status === "active" ? "text-emerald-700" : "text-zinc-500"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      v.status === "active" ? "bg-emerald-500" : "bg-zinc-400"
                    }`}
                  />
                  {v.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
