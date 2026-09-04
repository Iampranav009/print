"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Store, AlertCircle, Loader2 } from "lucide-react";

/* ─── Step types ─── */
type Step = 1 | 2 | 3;

/* ─── Step indicator with dots + labels ─── */
function StepIndicator({ current }: { current: Step }) {
  const steps: { number: Step; label: string; sublabel?: string }[] = [
    { number: 1, label: "Profile" },
    { number: 2, label: "Shop" },
    { number: 3, label: "Bank", sublabel: "(skippable)" },
  ];

  return (
    <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-100">
      {steps.map(({ number, label, sublabel }, idx) => {
        const isActive = number === current;
        const isDone = number < current;
        return (
          <div key={number} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isDone
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-100 text-zinc-400"
              }`}
            >
              {isDone ? <CheckCircle2 className="w-4 h-4" /> : number}
            </div>
            <div className="flex flex-col">
              <span
                className={`text-xs font-medium ${
                  isActive ? "text-zinc-900" : isDone ? "text-zinc-700" : "text-zinc-400"
                }`}
              >
                {label}
              </span>
              {sublabel && (
                <span className="text-[10px] text-zinc-400 leading-tight">{sublabel}</span>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className="w-8 sm:w-12 h-px bg-zinc-200 mx-1 hidden xs:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Inline error component ─── */
function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-700 mt-2" role="alert">
      <XCircle className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
}

/* ─── Step 1: Profile ─── */
function StepProfile({
  initialName = "",
  initialPhone = "",
  initialAddress = "",
  onNext,
}: {
  initialName?: string;
  initialPhone?: string;
  initialAddress?: string;
  onNext: () => void;
}) {
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Indian phone validation: 10 digits, optionally starting with +91 or 0
  const cleanDigits = phone.replace(/\D/g, "");
  const isValidPhone =
    (cleanDigits.length === 10 && /^[6-9]\d{9}$/.test(cleanDigits)) ||
    (cleanDigits.length === 12 && cleanDigits.startsWith("91") && /^[6-9]\d{9}$/.test(cleanDigits.slice(2)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone) {
      setError("Please enter a valid 10-digit Indian phone number (starting with 6-9).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save profile");
      }
      onNext();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Personal profile</h2>
        <p className="text-sm text-zinc-500 mt-1">Tell us your contact details for official communication.</p>
      </div>

      <div>
        <label htmlFor="ob-full-name" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Full name <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="ob-full-name"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ravi Kumar"
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="ob-phone" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Phone number <span className="text-red-500" aria-hidden="true">*</span>
          <span className="text-xs text-zinc-400 font-normal ml-1">(10-digit Indian mobile)</span>
        </label>
        <input
          id="ob-phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="9876543210"
          maxLength={15}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
            phone.length > 0 && !isValidPhone ? "border-amber-300 bg-amber-50/50" : "border-zinc-200"
          }`}
          aria-required="true"
        />
        {phone.length > 0 && !isValidPhone && (
          <p className="text-xs text-amber-600 mt-1">Enter a 10-digit number starting with 6, 7, 8, or 9.</p>
        )}
      </div>

      <div>
        <label htmlFor="ob-address" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Address <span className="text-xs font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="ob-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Shop 12, Ground Floor, Market Road"
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        />
      </div>

      {error && <InlineError message={error} />}

      <button
        type="submit"
        disabled={loading || !fullName.trim() || !phone.trim()}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
      >
        {loading ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}

/* ─── Step 2: Shop Claim ─── */
function StepShop({
  existingShop,
  onNext,
}: {
  existingShop: { id: string; name: string; location: string | null } | null;
  onNext: () => void;
}) {
  const [inviteInput, setInviteInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedShop, setClaimedShop] = useState(existingShop);
  const [showNoInviteCard, setShowNoInviteCard] = useState(false);

  // Extract token from input (supports raw token or full claim URL)
  const extractToken = (val: string): string => {
    const trimmed = val.trim();
    try {
      const url = new URL(trimmed);
      const t = url.searchParams.get("token");
      if (t) return t;
    } catch {
      // not a full url
    }
    const match = trimmed.match(/[?&]token=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return trimmed;
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractToken(inviteInput);
    if (!token) {
      setError("Please paste a valid invite link or token.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to claim shop with this invite.");
      }

      // Fetch fresh shop info
      const meRes = await fetch("/api/vendor/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setClaimedShop(meData.shop);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to claim shop");
    } finally {
      setLoading(false);
    }
  };

  // Already claimed shop case
  if (claimedShop) {
    return (
      <div className="space-y-6 text-left">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Your connected shop</h2>
          <p className="text-sm text-zinc-500 mt-1">Your account is successfully linked to this shop.</p>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900">{claimedShop.name}</h3>
            <p className="text-sm text-zinc-500">{claimedShop.location || "Location not set yet"}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          Continue to bank details
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Connect your shop</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Have you been invited to a shop? Paste your invite link or token below.
        </p>
      </div>

      <form onSubmit={handleClaim} className="space-y-4">
        <div>
          <label htmlFor="ob-invite-token" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Invite link or token
          </label>
          <input
            id="ob-invite-token"
            type="text"
            required
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            placeholder="https://printbuddy.app/vendor/claim?token=... or token"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-required="true"
          />
        </div>

        {error && <InlineError message={error} />}

        <button
          type="submit"
          disabled={loading || !inviteInput.trim()}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Claiming shop…
            </>
          ) : (
            "Claim shop"
          )}
        </button>
      </form>

      {/* "I don't have an invite" toggle */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => setShowNoInviteCard((prev) => !prev)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
        >
          {showNoInviteCard ? "Hide help" : "I don't have an invite link"}
        </button>
      </div>

      {showNoInviteCard && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-2 text-xs text-amber-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            Need an invite?
          </div>
          <p>
            Shops on PrintBuddy are currently onboarded by our operations team. If you operate a print shop and wish to join the network, please contact us at{" "}
            <a href="mailto:support@printbuddy.app" className="underline font-medium">
              support@printbuddy.app
            </a>{" "}
            or speak to your PrintBuddy administrator to receive your invite link.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Step 3: Bank ─── */
function StepBank({ onFinish }: { onFinish: () => void }) {
  const router = useRouter();
  const [holderName, setHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ifscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ifscValid) {
      setError("Invalid IFSC format. Expected 4 letters, 0, then 6 alphanumeric characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/bank", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_holder_name: holderName.trim(),
          account_number: accountNumber.trim(),
          ifsc_code: ifsc.trim(),
          bank_name: bankName.trim() || null,
          upi_id: upiId.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save bank details");
      }
      onFinish();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save bank details");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Bank is not required to receive orders, only for payouts.
    router.push("/vendor");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Bank details</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Add your bank details to receive payouts. You can also skip this and configure it later.
        </p>
      </div>

      <div>
        <label htmlFor="ob-holder" className="block text-sm font-medium text-zinc-700 mb-1">
          Account holder name <span className="text-red-500">*</span>
        </label>
        <input
          id="ob-holder"
          type="text"
          required
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          placeholder="Ravi Kumar"
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="ob-account" className="block text-sm font-medium text-zinc-700 mb-1">
          Account number <span className="text-red-500">*</span>
        </label>
        <input
          id="ob-account"
          type="text"
          required
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="123456789012"
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="ob-ifsc" className="block text-sm font-medium text-zinc-700 mb-1">
          IFSC code <span className="text-red-500">*</span>
        </label>
        <input
          id="ob-ifsc"
          type="text"
          required
          value={ifsc}
          onChange={(e) => setIfsc(e.target.value.toUpperCase())}
          placeholder="SBIN0001234"
          maxLength={11}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
            ifsc.length > 0
              ? ifscValid
                ? "border-emerald-300 bg-emerald-50/40"
                : "border-red-300 bg-red-50/40"
              : "border-zinc-200"
          }`}
          aria-required="true"
        />
        {ifsc.length > 0 && !ifscValid && (
          <p className="text-xs text-red-600 mt-1">Expected 4 letters, 0, then 6 alphanumeric characters.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ob-bank-name" className="block text-sm font-medium text-zinc-700 mb-1">
            Bank name <span className="text-xs font-normal text-zinc-400">(opt.)</span>
          </label>
          <input
            id="ob-bank-name"
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="State Bank of India"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          />
        </div>
        <div>
          <label htmlFor="ob-upi" className="block text-sm font-medium text-zinc-700 mb-1">
            UPI ID <span className="text-xs font-normal text-zinc-400">(opt.)</span>
          </label>
          <input
            id="ob-upi"
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="ravi@upi"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          />
        </div>
      </div>

      {error && <InlineError message={error} />}

      <div className="pt-2 space-y-3">
        <button
          type="submit"
          disabled={loading || !holderName.trim() || !accountNumber.trim() || !ifscValid}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          {loading ? "Saving…" : "Save & Finish"}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-zinc-500 hover:text-zinc-800 font-medium py-1 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
          >
            Skip for now &rarr;
          </button>
        </div>
      </div>
    </form>
  );
}

/* ─── Main Onboarding Wizard ─── */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [profileData, setProfileData] = useState<{ full_name: string; phone: string; address: string | null } | null>(null);
  const [shopData, setShopData] = useState<{ id: string; name: string; location: string | null } | null>(null);
  const [done, setDone] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/vendor/me");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfileData(data.profile);
        }
        if (data.shop) {
          setShopData(data.shop);
        }
        // If profile exists already, advance to step 2
        if (data.profile?.full_name && data.profile?.phone) {
          setStep(2);
        }
        // If both profile and shop already exist, advance to step 3
        if (data.profile?.full_name && data.hasShop) {
          setStep(3);
        }
      }
    } catch {
      // ignore
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleFinish = () => {
    setDone(true);
    setTimeout(() => {
      router.push("/vendor");
    }, 1500);
  };

  if (initialLoading) {
    return (
      <div className="w-full max-w-[560px] bg-white rounded-3xl shadow-md p-8 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-zinc-500">Loading your account…</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-[560px] bg-white rounded-3xl shadow-md p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Setup complete!</h2>
        <p className="text-sm text-zinc-500">Redirecting you to your seller dashboard…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px] bg-white rounded-3xl shadow-md p-8">
      {/* PrintBuddy Wordmark */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl font-black tracking-tight text-indigo-600">Print</span>
        <span className="text-2xl font-black tracking-tight text-zinc-900">Buddy</span>
        <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md ml-1">
          Seller Setup
        </span>
      </div>

      <StepIndicator current={step} />

      {step === 1 && (
        <StepProfile
          initialName={profileData?.full_name || ""}
          initialPhone={profileData?.phone || ""}
          initialAddress={profileData?.address || ""}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepShop
          existingShop={shopData}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepBank onFinish={handleFinish} />
      )}
    </div>
  );
}
