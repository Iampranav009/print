"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Wallet, AlertCircle, CheckCircle2, Clock, XCircle, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

type PayoutStatus = "pending" | "approved" | "rejected" | "paid";

interface PayoutRequest {
  id: string;
  amount_paise: number;
  platform_fee_paise: number;
  net_payout_paise: number;
  status: PayoutStatus;
  note: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

interface PayoutData {
  shop_id: string;
  platform_fee_bps: number;
  gross_revenue_paise: number;
  lifetime_available_paise: number;
  already_requested_paise: number;
  available_paise: number;
  has_bank: boolean;
  bank_verified: boolean;
  requests: PayoutRequest[];
}

function formatPaise(p: number): string {
  return `₹${(p / 100).toFixed(2)}`;
}

function StatusBadge({ status }: { status: PayoutStatus }) {
  const config: Record<PayoutStatus, { label: string; className: string; icon: React.ElementType }> = {
    pending: { label: "Pending review", className: "bg-amber-100 text-amber-700", icon: Clock },
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

export default function VendorPayoutsPage() {
  const [data, setData] = useState<PayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vendor/payouts");
      if (res.ok) {
        setData(await res.json());
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (data && !data.bank_verified) {
      setError("Bank details are pending admin verification.");
      return;
    }
    const rupees = parseFloat(amount);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setError("Enter a valid amount greater than 0");
      return;
    }
    const paise = Math.round(rupees * 100);
    if (data && paise > data.available_paise) {
      setError(`Amount exceeds available balance (${formatPaise(data.available_paise)})`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_paise: paise, note: note.trim() || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to submit request");
      setSuccessMsg("Payout request submitted. The admin team will review it shortly.");
      setAmount("");
      setNote("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5">
          <p className="text-sm font-medium text-zinc-500">Lifetime revenue</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 tabular-nums">
            {formatPaise(data?.gross_revenue_paise ?? 0)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Gross collected before platform fees</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5">
          <p className="text-sm font-medium text-zinc-500">Already requested</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 tabular-nums">
            {formatPaise(data?.already_requested_paise ?? 0)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Pending, approved, or paid out</p>
        </div>
        <div className="bg-indigo-600 text-white rounded-2xl shadow-sm p-5">
          <p className="text-sm font-medium text-indigo-100">Available to withdraw</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {formatPaise(data?.available_paise ?? 0)}
          </p>
          <p className="mt-1 text-xs text-indigo-100">
            After {((data?.platform_fee_bps ?? 200) / 100).toFixed(2)}% platform fee
          </p>
        </div>
      </div>

      {/* Bank verification gate */}
      {data && (
        <>
          {!data.has_bank ? (
            <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-900">Add bank details to request payouts</p>
                <p className="text-xs text-zinc-500 mt-1">
                  We need your account and UPI details to route funds. The PrintBuddy team will verify them
                  within 24 hours.
                </p>
                <Link
                  href="/vendor/bank"
                  className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Add bank details
                </Link>
              </div>
            </div>
          ) : !data.bank_verified ? (
            <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-900">Bank details pending admin verification</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Payouts unlock once the PrintBuddy team verifies your account details — usually within 24
                  hours of submission.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 flex items-center gap-2 text-sm text-emerald-800">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="font-medium">Bank details verified — you can request payouts.</span>
            </div>
          )}
        </>
      )}

      {/* Request form */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Request funds</h2>
            <p className="text-sm text-zinc-500">
              Funds will be transferred to your registered bank account after admin review.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-zinc-700 mb-1">
              Amount (INR) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg text-zinc-500">₹</span>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              />
              {data && data.available_paise > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount((data.available_paise / 100).toFixed(2))}
                  className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Max
                </button>
              )}
            </div>
            {amount && Number.isFinite(parseFloat(amount)) && parseFloat(amount) > 0 && (
              <p className="mt-2 text-xs text-zinc-500">
                Platform fee ({((data?.platform_fee_bps ?? 200) / 100).toFixed(2)}%):{" "}
                {formatPaise(Math.floor(parseFloat(amount) * 100 * (data?.platform_fee_bps ?? 200) / 10_000))} · Net to
                you:{" "}
                <span className="font-semibold text-zinc-800">
                  {formatPaise(
                    Math.round(parseFloat(amount) * 100) -
                      Math.floor(parseFloat(amount) * 100 * (data?.platform_fee_bps ?? 200) / 10_000)
                  )}
                </span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="note" className="block text-sm font-medium text-zinc-700 mb-1">
              Note <span className="text-xs font-normal text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything the admin should know…"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700">{successMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !data || data.available_paise <= 0 || !data.bank_verified}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            {submitting ? "Submitting…" : "Submit payout request"}
          </button>

          {data && !data.bank_verified && (
            <p className="text-xs text-amber-700">
              Requests are locked until your bank details are verified by the admin team.
            </p>
          )}
          {data && data.bank_verified && data.available_paise <= 0 && (
            <p className="text-xs text-zinc-500">
              No withdrawable balance yet. Once customers pay for prints, funds appear here.
            </p>
          )}
        </form>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-lg font-semibold text-zinc-900">Payout history</h2>
        </div>
        {(data?.requests ?? []).length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-400 text-center">No payout requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-zinc-100">
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Requested</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Fee</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Net</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Note</th>
                </tr>
              </thead>
              <tbody>
                {data!.requests.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3 text-zinc-500 text-xs">
                      {new Date(r.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-900 font-medium">{formatPaise(r.amount_paise)}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-500">{formatPaise(r.platform_fee_paise)}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-900 font-medium">
                      {formatPaise(r.net_payout_paise)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-3 text-xs text-zinc-500 max-w-xs">
                      {r.admin_note ? (
                        <div>
                          <span className="font-semibold text-zinc-700">Admin: </span>
                          {r.admin_note}
                        </div>
                      ) : r.note ? (
                        <span className="text-zinc-400 italic">{r.note}</span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
