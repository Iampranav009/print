"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Save, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type UserData = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
};

type ProfileData = {
  user_id: string;
  full_name: string;
  phone: string;
  address: string | null;
};

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

export default function VendorProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/vendor/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user ?? null);
          setProfile(data.profile ?? null);
          setFullName(data.profile?.full_name ?? "");
          setPhone(data.profile?.phone ?? "");
          setAddress(data.profile?.address ?? "");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setInlineError(null);
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
        throw new Error(err.error ?? "Failed to save");
      }
      const updated = await res.json();
      if (updated.profile) setProfile(updated.profile);
      setToast({ message: "Profile saved.", type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setInlineError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      router.push("/login");
    } catch {
      setToast({ message: "Sign-out failed, try again.", type: "error" });
      setSigningOut(false);
    }
  };

  if (loading) {
    return <div className="max-w-lg bg-white rounded-2xl shadow-sm border border-zinc-100 h-80 animate-pulse" />;
  }

  const initials = (user?.name ?? user?.email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="max-w-lg space-y-6">
        {/* Google account block */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Google account</h2>
          <div className="flex items-center gap-4">
            {user?.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.avatar_url}
                alt={user.name ?? "Avatar"}
                className="w-14 h-14 rounded-full object-cover border border-zinc-200"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              {user?.name && (
                <p className="text-sm font-medium text-zinc-900 truncate">{user.name}</p>
              )}
              <p className="text-sm text-zinc-400 truncate">{user?.email ?? "—"}</p>
              <p className="text-xs text-zinc-300 mt-0.5">Managed by Google — read-only</p>
            </div>
          </div>
        </div>

        {/* Editable profile */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-5">Profile</h2>

          {inlineError && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-700" role="alert">
              <XCircle className="w-4 h-4 shrink-0" />
              {inlineError}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Full name
              </label>
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ravi Kumar"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-label="Full name"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-label="Phone"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Address <span className="text-xs font-normal text-zinc-400">(optional)</span>
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop 12, Ground Floor, Hiranandani Estate, Thane 400607"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-label="Address"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              aria-label="Save profile"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">Session</h2>
          <p className="text-sm text-zinc-400 mb-4">Sign out of the vendor portal on this device.</p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 hover:border-red-300 hover:text-red-600 text-sm font-medium text-zinc-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            aria-label="Sign out of vendor portal"
          >
            <LogOut className="w-4 h-4" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </>
  );
}
