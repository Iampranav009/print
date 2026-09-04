"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle, Wallet, Clock, AlertCircle } from "lucide-react";

type Status = "pending" | "approved" | "rejected" | "paid";

interface PayoutRow {
  id: string;
  shop_id: string;
  amount_paise: number;
  platform_fee_paise: number;
  net_payout_paise: number;
  status: Status;
  note: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  shop: { id: string; name: string; location: string | null } | null;
  bank: {
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string | null;
    upi_id: string | null;
    verified: boolean;
  } | null;
}

interface Props {
  onCountChange?: (pending: number) => void;
}

function formatPaise(p: number): string {
  return `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: Status }) {
  const config: Record<Status, { label: string; className: string; icon: React.ElementType }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-700", icon: Clock },
    approved: { label: "Approved", className: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
    paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-700", icon: XCircle },
  };
  const { label, className, icon: Icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export function AdminPayouts({ onCountChange }: Props) {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const url = statusFilter === "all" ? "/api/admin/payouts" : `/api/admin/payouts?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRows(data.requests ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // Propagate pending count to the sidebar.
  useEffect(() => {
    if (!onCountChange) return;
    // Only compute against the full list when unfiltered; otherwise re-fetch pending count separately.
    if (statusFilter === "all" || statusFilter === "pending") {
      const pendingCount = rows.filter((r) => r.status === "pending").length;
      onCountChange(pendingCount);
    }
  }, [rows, statusFilter, onCountChange]);

  const act = async (id: string, status: "approved" | "rejected" | "paid") => {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, admin_note: adminNote.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update");
      }
      setExpandedId(null);
      setAdminNote("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Payout requests</h2>
          <p className="text-sm text-zinc-500 mt-1">Vendors asking to withdraw their earnings.</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | Status)}
          className="px-3 py-2 rounded-xl border border-zinc-200 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        {loading ? (
          <div className="p-6 flex justify-center">
            <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500">No payout requests to show.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {rows.map((r) => {
              const expanded = expandedId === r.id;
              return (
                <div key={r.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-semibold text-zinc-900">{r.shop?.name ?? "(unknown shop)"}</p>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.shop?.location && (
                        <p className="text-xs text-zinc-500 mt-0.5">{r.shop.location}</p>
                      )}
                      <p className="text-xs text-zinc-400 mt-1">
                        Requested {new Date(r.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-zinc-900 tabular-nums">
                        {formatPaise(r.net_payout_paise)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Gross {formatPaise(r.amount_paise)} · Fee {formatPaise(r.platform_fee_paise)}
                      </p>
                    </div>
                  </div>

                  {r.bank ? (
                    <div className="mt-3 p-3 rounded-xl bg-zinc-50 text-xs text-zinc-700 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        <span className="text-zinc-500">Name:</span> {r.bank.account_holder_name}
                      </span>
                      {r.bank.bank_name && (
                        <span>
                          <span className="text-zinc-500">Bank:</span> {r.bank.bank_name}
                        </span>
                      )}
                      <span>
                        <span className="text-zinc-500">A/C:</span> ****{r.bank.account_number.slice(-4)}
                      </span>
                      <span>
                        <span className="text-zinc-500">IFSC:</span> {r.bank.ifsc_code}
                      </span>
                      {r.bank.upi_id && (
                        <span>
                          <span className="text-zinc-500">UPI:</span> {r.bank.upi_id}
                        </span>
                      )}
                      {r.bank.verified ? (
                        <span className="text-emerald-600 font-semibold">Verified</span>
                      ) : (
                        <span className="text-amber-600 font-semibold">Unverified</span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-red-600">No bank details on file for this shop.</p>
                  )}

                  {r.note && (
                    <p className="mt-3 text-sm text-zinc-600 italic">Vendor note: {r.note}</p>
                  )}
                  {r.admin_note && (
                    <p className="mt-1 text-sm text-zinc-600">Admin note: {r.admin_note}</p>
                  )}

                  {r.status === "pending" || r.status === "approved" ? (
                    <div className="mt-4">
                      {expanded ? (
                        <div className="space-y-3">
                          <textarea
                            rows={2}
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder="Optional note to the vendor…"
                            className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                          />
                          <div className="flex flex-wrap gap-2">
                            {r.status === "pending" && (
                              <button
                                onClick={() => act(r.id, "approved")}
                                disabled={busy === r.id}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              onClick={() => act(r.id, "paid")}
                              disabled={busy === r.id}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold"
                            >
                              Mark paid
                            </button>
                            {r.status === "pending" && (
                              <button
                                onClick={() => act(r.id, "rejected")}
                                disabled={busy === r.id}
                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setExpandedId(null);
                                setAdminNote("");
                              }}
                              className="px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setExpandedId(r.id);
                            setAdminNote(r.admin_note ?? "");
                          }}
                          className="px-3 py-1.5 rounded-xl border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                          Take action
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
