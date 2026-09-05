"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { Modal } from "@/components/vendor/Modal";

/* ─── Types ─── */
type ShopStatus = "active" | "paused" | "pending";

type Shop = {
  id: string;
  name: string;
  location: string | null;
  status: ShopStatus;
  virtual_mode: boolean;
  owner_email: string | null;
  created_at: string;
};

type InviteStatus = "unclaimed" | "claimed" | "expired";

type Invite = {
  id: string;
  shop_id: string;
  shop_name: string;
  intended_email: string | null;
  status: InviteStatus;
  token: string;
  created_at: string;
  expires_at: string;
};

/* ─── Helpers ─── */
function StatusDot({ status }: { status: ShopStatus | InviteStatus }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500",
    paused: "bg-amber-400",
    pending: "bg-zinc-400",
    unclaimed: "bg-amber-400",
    claimed: "bg-emerald-500",
    expired: "bg-zinc-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-zinc-700 bg-zinc-100`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status] ?? "bg-zinc-400"}`} aria-hidden="true" />
      {status}
    </span>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
      aria-label={label}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ─── Shops Section ─── */
function ShopsSection() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // New shop form
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newVirtual, setNewVirtual] = useState(true);

  const fetchShops = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shops");
      if (res.ok) {
        const data = await res.json();
        setShops(data.shops ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          location: newLocation.trim() || null,
          virtual_mode: newVirtual,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create shop");
      }
      await fetchShops();
      setModalOpen(false);
      setNewName("");
      setNewLocation("");
      setNewVirtual(true);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New shop">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="new-shop-name" className="block text-sm font-medium text-zinc-700 mb-1">
              Shop name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="new-shop-name"
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ravi Print Works"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="new-shop-location" className="block text-sm font-medium text-zinc-700 mb-1">
              Location <span className="text-xs font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="new-shop-location"
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Hiranandani Estate, Thane"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newVirtual}
              onChange={(e) => setNewVirtual(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            <span className="text-sm text-zinc-700">Virtual mode (no physical printer required)</span>
          </label>

          {createError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2" role="alert">{createError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              {creating ? "Creating…" : "Create shop"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900">Shops</h2>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Create new shop"
          >
            <Plus className="w-4 h-4" />
            New shop
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          {loading ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            </div>
          ) : shops.length === 0 ? (
            <p className="px-6 py-8 text-sm text-zinc-400 text-center">No shops yet. Create one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-zinc-100">
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Location</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Virtual</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Owner</th>
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop) => (
                    <tr key={shop.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-zinc-900">{shop.name}</td>
                      <td className="px-4 py-3 text-zinc-500">{shop.location ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-3"><StatusDot status={shop.status} /></td>
                      <td className="px-4 py-3">
                        {shop.virtual_mode && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                            Virtual
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {shop.owner_email ? (
                          <span className="text-zinc-600">{shop.owner_email}</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            Unclaimed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-zinc-400 text-xs">
                        {new Date(shop.created_at).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ─── Invites Section ─── */
function InvitesSection() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [filterShopId, setFilterShopId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // New invite form
  const [inviteShopId, setInviteShopId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  // "new" (default) creates a fresh shop AND the invite in one step.
  // "existing" picks an unclaimed shop from the dropdown — kept for
  // completeness but the admin usually just wants to invite by email.
  const [inviteMode, setInviteMode] = useState<"new" | "existing">("new");
  const [inviteShopName, setInviteShopName] = useState("");
  const [inviteShopLocation, setInviteShopLocation] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, shopsRes] = await Promise.all([
        fetch(`/api/admin/invites${filterShopId !== "all" ? `?shopId=${filterShopId}` : ""}`),
        fetch("/api/admin/shops"),
      ]);
      if (invRes.ok) {
        const data = await invRes.json();
        setInvites(data.invites ?? []);
      }
      if (shopsRes.ok) {
        const data = await shopsRes.json();
        setShops(data.shops ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [filterShopId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setGeneratedLink(null);
    try {
      // Two shapes based on the mode toggle. Note the field name is
      // `email` (the API's canonical name) not `intended_email`.
      const payload: Record<string, unknown> =
        inviteMode === "new"
          ? {
              new_shop: {
                name: inviteShopName.trim(),
                location: inviteShopLocation.trim() || undefined,
              },
              email: inviteEmail.trim() || undefined,
            }
          : {
              shop_id: inviteShopId,
              email: inviteEmail.trim() || undefined,
            };

      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to generate invite");
      }
      const data = await res.json();
      const origin = window.location.origin;
      const link =
        data.claimUrl ??
        `${origin}/vendor/claim?token=${data.invite?.token ?? data.token}`;
      setGeneratedLink(link);
      await fetchData();
      setInviteShopId("");
      setInviteEmail("");
      setInviteShopName("");
      setInviteShopLocation("");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setCreating(false);
    }
  };

  const claimLink = (token: string) => `${window.location.origin}/vendor/claim?token=${token}`;

  return (
    <>
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setGeneratedLink(null); }}
        title="Generate invite"
      >
        {!generatedLink ? (
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Mode toggle: create fresh or pick existing */}
            <div
              role="tablist"
              aria-label="Invite mode"
              className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl w-full"
            >
              <button
                type="button"
                role="tab"
                aria-selected={inviteMode === "new"}
                onClick={() => setInviteMode("new")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  inviteMode === "new"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Create new shop + invite
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inviteMode === "existing"}
                onClick={() => setInviteMode("existing")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  inviteMode === "existing"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Existing shop
              </button>
            </div>

            {inviteMode === "new" ? (
              <>
                <div>
                  <label htmlFor="inv-shop-name" className="block text-sm font-medium text-zinc-700 mb-1">
                    Shop name <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="inv-shop-name"
                    type="text"
                    required
                    value={inviteShopName}
                    onChange={(e) => setInviteShopName(e.target.value)}
                    placeholder="e.g. Xerox Point, Andheri"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  />
                </div>
                <div>
                  <label htmlFor="inv-shop-location" className="block text-sm font-medium text-zinc-700 mb-1">
                    Location <span className="text-xs font-normal text-zinc-400">(optional — visible to customers)</span>
                  </label>
                  <input
                    id="inv-shop-location"
                    type="text"
                    value={inviteShopLocation}
                    onChange={(e) => setInviteShopLocation(e.target.value)}
                    placeholder="Building / area"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="inv-shop" className="block text-sm font-medium text-zinc-700 mb-1">
                  Unclaimed shop <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <select
                  id="inv-shop"
                  required={inviteMode === "existing"}
                  value={inviteShopId}
                  onChange={(e) => setInviteShopId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 bg-white"
                  aria-required="true"
                >
                  <option value="">Select an unclaimed shop…</option>
                  {shops
                    .filter((s) => !s.owner_email)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.location ? `(${s.location})` : ""}
                      </option>
                    ))}
                </select>
                {shops.filter((s) => !s.owner_email).length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No unclaimed shops. Switch to &quot;Create new shop + invite&quot; above.
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="inv-email" className="block text-sm font-medium text-zinc-700 mb-1">
                Vendor email <span className="text-xs font-normal text-zinc-400">(optional — restricts claim to this email)</span>
              </label>
              <input
                id="inv-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="vendor@example.com"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              />
              {inviteEmail.trim() && (
                <p className="mt-1 text-xs text-zinc-500">
                  Only this Google account can claim the invite.
                </p>
              )}
            </div>

            {createError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2" role="alert">{createError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={
                  creating ||
                  (inviteMode === "new"
                    ? !inviteShopName.trim()
                    : !inviteShopId)
                }
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                {creating ? "Generating…" : "Generate invite"}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Share this link with the vendor. It expires in 7 days and can only be used once.
            </p>
            <div className="bg-zinc-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="flex-1 text-xs text-zinc-700 break-all font-mono">{generatedLink}</span>
              <CopyButton text={generatedLink} label="Copy invite link" />
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`You've been invited to PrintBuddy: ${generatedLink}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:border-green-400 hover:text-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-label="Share via WhatsApp"
              >
                <ExternalLink className="w-3.5 h-3.5" /> WhatsApp
              </a>
              <a
                href={`mailto:?subject=PrintBuddy%20Vendor%20Invite&body=${encodeURIComponent(`You've been invited to PrintBuddy as a vendor.\n\nClick here to get started: ${generatedLink}`)}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-label="Share via email"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Email
              </a>
            </div>
            <button
              onClick={() => { setModalOpen(false); setGeneratedLink(null); }}
              className="w-full py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              Done
            </button>
          </div>
        )}
      </Modal>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-zinc-900">Vendor invites</h2>
          <div className="flex items-center gap-3">
            <select
              value={filterShopId}
              onChange={(e) => setFilterShopId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 bg-white"
              aria-label="Filter invites by shop"
            >
              <option value="all">All shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              aria-label="Generate new invite"
            >
              <Plus className="w-4 h-4" />
              Generate invite
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          {loading ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            </div>
          ) : invites.length === 0 ? (
            <p className="px-6 py-8 text-sm text-zinc-400 text-center">No invites generated yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-zinc-100">
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Shop</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Created</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Expires</th>
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => (
                    <tr key={inv.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-zinc-900">{inv.shop_name}</td>
                      <td className="px-4 py-3 text-zinc-500">{inv.intended_email ?? <span className="text-zinc-300">Any</span>}</td>
                      <td className="px-4 py-3"><StatusDot status={inv.status} /></td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {new Date(inv.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {new Date(inv.expires_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-3">
                        {inv.status === "unclaimed" && (
                          <CopyButton text={claimLink(inv.token)} label={`Copy invite link for ${inv.shop_name}`} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ─── Exports ─── */
interface AdminSectionsProps {
  showShopsOnly?: boolean;
  showInvitesOnly?: boolean;
}

export function AdminSections({ showShopsOnly, showInvitesOnly }: AdminSectionsProps = {}) {
  if (showShopsOnly) return <ShopsSection />;
  if (showInvitesOnly) return <InvitesSection />;
  return (
    <div className="space-y-8">
      <ShopsSection />
      <InvitesSection />
    </div>
  );
}
