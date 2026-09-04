"use client";

import { useState, useEffect } from "react";
import { Save, CheckCircle, XCircle } from "lucide-react";

type ShopData = {
  id: string;
  name: string;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  virtual_mode: boolean;
};

function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium transition-all ${
        type === "success"
          ? "bg-emerald-600 text-white"
          : "bg-red-600 text-white"
      }`}
      role="alert"
      aria-live="polite"
    >
      {type === "success" ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 shrink-0" />
      )}
      {message}
    </div>
  );
}

export default function ShopPage() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/vendor/me");
        if (res.ok) {
          const data = await res.json();
          if (data.shop) {
            setShop(data.shop);
            setName(data.shop.name ?? "");
            setLocation(data.shop.location ?? "");
            setContactEmail(data.shop.contact_email ?? "");
            setContactPhone(data.shop.contact_phone ?? "");
          }
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
    try {
      const res = await fetch("/api/vendor/shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      const updated = await res.json();
      if (updated.shop) {
        setShop(updated.shop);
      }
      setToast({ message: "Shop details saved.", type: "success" });
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to save",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 h-80" />
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="space-y-6 max-w-2xl">
        {/* Shop form */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-6">Shop information</h2>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label htmlFor="shop-name" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Shop name <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="shop-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Campus Copy Centre"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-shadow"
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="shop-location" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Public location description
              </label>
              <input
                id="shop-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Campus Gate, IIT Bombay"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-shadow"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Shown to customers in the app when selecting a nearby shop.
              </p>
            </div>

            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Contact email
              </label>
              <input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="shop@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="contact-phone" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Contact phone
              </label>
              <input
                id="contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-shadow"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-label="Save shop details"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 opacity-60">
          <h2 className="text-base font-semibold text-zinc-400 mb-2">Danger zone</h2>
          <p className="text-sm text-zinc-400">
            Contact PrintBuddy support to suspend or delete your shop.
          </p>
        </div>
      </div>
    </>
  );
}
