"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle2, XCircle, Save } from "lucide-react";
import { Modal } from "@/components/vendor/Modal";

type BankData = {
  shop_id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string | null;
  branch: string | null;
  upi_id: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
};

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium ${
        type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
      }`}
      role="alert"
      aria-live="polite"
    >
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
      {message}
    </div>
  );
}

export default function BankPage() {
  const [bank, setBank] = useState<BankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Form fields
  const [holderName, setHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");
  const [upiId, setUpiId] = useState("");

  const ifscValid = IFSC_REGEX.test(ifsc);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/vendor/me");
        if (res.ok) {
          const data = await res.json();
          if (data.bank) {
            setBank(data.bank);
            setHolderName(data.bank.account_holder_name ?? "");
            setAccountNumber(data.bank.account_number ?? "");
            setIfsc(data.bank.ifsc_code ?? "");
            setBankName(data.bank.bank_name ?? "");
            setBranch(data.bank.branch ?? "");
            setUpiId(data.bank.upi_id ?? "");
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const doSave = async () => {
    setConfirmOpen(false);
    setSaving(true);
    setInlineError(null);
    try {
      const res = await fetch("/api/vendor/bank", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_holder_name: holderName.trim(),
          account_number: accountNumber.trim(),
          ifsc_code: ifsc.trim(),
          bank_name: bankName.trim() || null,
          branch: branch.trim() || null,
          upi_id: upiId.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      const updated = await res.json();
      if (updated.bank) setBank(updated.bank);
      setShowAccount(false);
      setToast({ message: "Bank details saved. Pending re-verification.", type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setInlineError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holderName.trim() || !accountNumber.trim() || !ifscValid) return;
    setConfirmOpen(true);
  };

  if (loading) {
    return <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 h-80 animate-pulse max-w-2xl" />;
  }

  const maskedAccount = accountNumber
    ? "\u2022\u2022\u2022\u2022\u2022\u2022" + accountNumber.slice(-4)
    : "";

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Re-verification required"
      >
        <p className="text-sm text-zinc-600 mb-5">
          Saving new bank details will require re-verification by the PrintBuddy team. Payouts will be paused until verified. Continue?
        </p>
        <div className="flex gap-3">
          <button
            onClick={doSave}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Confirm save bank details"
          >
            Yes, save details
          </button>
          <button
            onClick={() => setConfirmOpen(false)}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Cancel"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <div className="max-w-2xl space-y-6">
        {/* Verification status */}
        {bank && (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-4 flex items-center gap-3">
            {bank.verified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
                Pending verification
              </span>
            )}
            {!bank.verified && (
              <p className="text-xs text-amber-700">
                Our team will verify your details within 24 hours before enabling payouts.
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-6">Bank details</h2>

          {inlineError && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-700" role="alert">
              <XCircle className="w-4 h-4 shrink-0" />
              {inlineError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account holder */}
            <div>
              <label htmlFor="holder-name" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Account holder name <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="holder-name"
                type="text"
                required
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Ravi Kumar"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-required="true"
              />
            </div>

            {/* Account number */}
            <div>
              <label htmlFor="account-number" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Account number <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <input
                  id="account-number"
                  type={showAccount ? "text" : "password"}
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={showAccount ? "123456789012" : maskedAccount || "••••••••••"}
                  className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 tabular-nums"
                  aria-required="true"
                  aria-label="Account number"
                />
                <button
                  type="button"
                  onClick={() => setShowAccount((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
                  aria-label={showAccount ? "Hide account number" : "Show account number"}
                >
                  {showAccount ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* IFSC */}
            <div>
              <label htmlFor="ifsc" className="block text-sm font-medium text-zinc-700 mb-1.5">
                IFSC code <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <input
                  id="ifsc"
                  type="text"
                  required
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="SBIN0001234"
                  maxLength={11}
                  className={`w-full px-3.5 py-2.5 pr-11 rounded-xl border text-sm uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                    ifsc.length > 0
                      ? ifscValid
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-red-300 bg-red-50"
                      : "border-zinc-200"
                  }`}
                  aria-required="true"
                  aria-label="IFSC code"
                  aria-invalid={ifsc.length > 0 && !ifscValid}
                  aria-describedby="ifsc-hint"
                />
                {ifsc.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {ifscValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
                    )}
                  </span>
                )}
              </div>
              {ifsc.length > 0 && !ifscValid && (
                <p id="ifsc-hint" className="mt-1 text-xs text-red-600">
                  Format: 4 letters + 0 + 6 alphanumeric (e.g. SBIN0001234)
                </p>
              )}
            </div>

            {/* Bank name */}
            <div>
              <label htmlFor="bank-name" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Bank name <span className="text-xs font-normal text-zinc-400">(optional)</span>
              </label>
              <input
                id="bank-name"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="State Bank of India"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              />
            </div>

            {/* Branch */}
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Branch <span className="text-xs font-normal text-zinc-400">(optional)</span>
              </label>
              <input
                id="branch"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="Powai, Mumbai"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              />
            </div>

            {/* UPI ID */}
            <div>
              <label htmlFor="upi-id" className="block text-sm font-medium text-zinc-700 mb-1.5">
                UPI ID <span className="text-xs font-normal text-zinc-400">(optional)</span>
              </label>
              <input
                id="upi-id"
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="ravi@upi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !holderName.trim() || !accountNumber.trim() || !ifscValid}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-label="Save bank details"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save bank details"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
