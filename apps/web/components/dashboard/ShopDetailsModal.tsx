"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Printer,
  Coins,
  ShieldCheck,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Cpu,
  Receipt,
  Share2,
} from "lucide-react";
import { Modal } from "@/components/vendor/Modal";

export type EnrichedShop = {
  id: string;
  name: string;
  location: string | null;
  status: "active" | "paused" | "pending";
  virtual_mode: boolean;
  commission_rate?: number | null;
  owner_phone?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string | null;
  created_at: string;
  owner_email: string | null;
  owner_name?: string | null;
  owner_address?: string | null;
  is_claimed?: boolean;
  owner?: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  invite?: {
    email: string | null;
    token: string;
    expires_at: string;
    claimed_at: string | null;
  } | null;
  pricing?: {
    bw_page_paise: number;
    color_page_paise: number;
    a3_multiplier: number;
    duplex_factor: number;
    min_charge_paise: number;
  } | null;
  printers?: Array<{
    id: string;
    os_printer_name: string;
    status?: string;
    online?: boolean;
    last_seen_at?: string | null;
    supports_color?: boolean;
    supports_duplex?: boolean;
    make_and_model?: string | null;
  }>;
  agent?: {
    id: string;
    platform: string | null;
    status: string | null;
    last_heartbeat: string | null;
  } | null;
  bank?: {
    bank_name: string | null;
    account_holder_name: string | null;
    account_number: string | null;
    ifsc: string | null;
    verified: boolean;
  } | null;
  stats?: {
    revenue_paise: number;
    prints: number;
    jobs_count: number;
  } | null;
};

interface ShopDetailsModalProps {
  open: boolean;
  onClose: () => void;
  shop: EnrichedShop | null;
}

function CopyableItem({
  text,
  label,
  children,
}: {
  text: string;
  label: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex items-center gap-1.5 group">
      {children}
      <button
        type="button"
        onClick={handleCopy}
        className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        title={`Copy ${label}`}
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <Check className="w-3.5 h-3.5" />
            <span>Copied!</span>
          </span>
        ) : (
          <Copy className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
        )}
      </button>
    </div>
  );
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ShopDetailsModal({ open, onClose, shop }: ShopDetailsModalProps) {
  if (!shop) return null;

  const email = shop.owner_email || shop.owner?.email || shop.contact_email || shop.invite?.email;
  const phone = shop.owner_phone || shop.owner?.phone || shop.contact_phone;
  const name = shop.owner_name || shop.owner?.name;
  const isClaimed = shop.is_claimed ?? !!shop.owner;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteLink = shop.invite?.token
    ? `${origin}/vendor/claim?token=${shop.invite.token}`
    : null;

  const agentIsOnline =
    shop.agent?.status === "online" &&
    !!shop.agent.last_heartbeat &&
    Date.now() - new Date(shop.agent.last_heartbeat).getTime() < 60_000;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={shop.name}
      className="max-w-2xl text-left"
    >
      <div className="space-y-6 pt-1 pb-2">
        {/* Top Badges & Meta */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-zinc-50 border border-zinc-100 p-3 rounded-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                shop.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  shop.status === "active" ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              {shop.status.toUpperCase()}
            </span>

            {shop.virtual_mode ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Virtual Mode
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                Physical Printer
              </span>
            )}

            {isClaimed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Claimed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <XCircle className="w-3.5 h-3.5" />
                Unclaimed
              </span>
            )}
          </div>

          <div className="flex items-center text-xs text-zinc-500 font-mono">
            <span className="text-zinc-400 mr-1">ID:</span>
            <CopyableItem text={shop.id} label="Shop ID">
              <span className="truncate max-w-[120px]">{shop.id}</span>
            </CopyableItem>
          </div>
        </div>

        {/* 1. Owner & Contact Information */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-zinc-900">Owner & Contact Details</h3>
            </div>
            {isClaimed ? (
              <span className="text-xs text-emerald-600 font-medium">Vendor onboarded</span>
            ) : (
              <span className="text-xs text-amber-600 font-medium">Awaiting vendor claim</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {/* Email Address */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Email ID</p>
              {email ? (
                <CopyableItem text={email} label="email address">
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium hover:underline break-all"
                    title="Click to compose email"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>{email}</span>
                  </a>
                </CopyableItem>
              ) : (
                <p className="text-zinc-400 italic text-xs">No email registered</p>
              )}
            </div>

            {/* Owner / Contact Name */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Owner Name</p>
              <p className="text-zinc-800 font-medium">
                {name || (isClaimed ? "Registered Vendor" : <span className="text-zinc-400 italic font-normal">Unassigned</span>)}
              </p>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Phone Number</p>
              {phone ? (
                <CopyableItem text={phone} label="phone number">
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-1.5 text-zinc-800 hover:text-indigo-600 font-medium hover:underline"
                    title="Click to call"
                  >
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{phone}</span>
                  </a>
                </CopyableItem>
              ) : (
                <p className="text-zinc-400 italic text-xs">No phone number</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Vendor Address</p>
              <p className="text-zinc-700 text-xs line-clamp-2">
                {shop.owner_address || shop.owner?.address || <span className="text-zinc-400 italic">Not provided</span>}
              </p>
            </div>
          </div>

          {/* Pending Invite info for unclaimed shops */}
          {!isClaimed && (
            <div className="mt-3 pt-3 border-t border-zinc-100 bg-amber-50/60 -mx-4 -mb-4 p-4 rounded-b-xl space-y-2">
              <p className="text-xs text-amber-800 font-medium">
                This shop has not been claimed yet.
                {shop.invite?.email ? ` An invite was sent to ${shop.invite.email}.` : ""}
              </p>
              {inviteLink && (
                <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-amber-200">
                  <span className="text-xs text-zinc-600 truncate font-mono">{inviteLink}</span>
                  <CopyableItem text={inviteLink} label="invite link">
                    <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">
                      Copy link
                    </span>
                  </CopyableItem>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Shop Location & Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-zinc-900">Location & Venue</h3>
            </div>
            <div className="space-y-1.5 text-xs">
              <div>
                <span className="text-zinc-400 block font-medium uppercase text-[10px]">Location Address</span>
                <span className="text-zinc-800 font-medium">{shop.location || "—"}</span>
              </div>
              {shop.latitude && shop.longitude && (
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-zinc-500 font-mono">
                    {shop.latitude.toFixed(4)}, {shop.longitude.toFixed(4)}
                  </span>
                  <a
                    href={`https://maps.google.com/?q=${shop.latitude},${shop.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    View map <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="pt-1 text-zinc-500 flex items-center gap-1 text-[11px]">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span>Created {new Date(shop.created_at).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Coins className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-zinc-900">Pricing & Commercials</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-50 p-2 rounded-lg">
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">B&W Page</span>
                <span className="text-sm font-bold text-zinc-900">
                  {shop.pricing ? formatPaise(shop.pricing.bw_page_paise) : "₹2.00"}
                </span>
              </div>
              <div className="bg-zinc-50 p-2 rounded-lg">
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">Color Page</span>
                <span className="text-sm font-bold text-zinc-900">
                  {shop.pricing ? formatPaise(shop.pricing.color_page_paise) : "₹10.00"}
                </span>
              </div>
              <div className="bg-zinc-50 p-2 rounded-lg">
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">Min Order</span>
                <span className="text-sm font-bold text-zinc-900">
                  {shop.pricing ? formatPaise(shop.pricing.min_charge_paise) : "₹3.00"}
                </span>
              </div>
              <div className="bg-zinc-50 p-2 rounded-lg">
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">Commission</span>
                <span className="text-sm font-bold text-zinc-900">
                  {((shop.commission_rate ?? 0.1) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Hardware & Agent Connection */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-zinc-900">Hardware & Print Agent</h3>
            </div>
            <span className="text-xs text-zinc-400">
              {shop.virtual_mode ? "No physical hardware needed" : "Physical spooler integration"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Agent Status */}
            <div className="bg-zinc-50 p-3 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                  Print Agent
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                    agentIsOnline ? "text-emerald-700" : "text-zinc-500"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      agentIsOnline ? "bg-emerald-500" : "bg-zinc-400"
                    }`}
                  />
                  {agentIsOnline ? "Connected" : "Offline"}
                </span>
              </div>
              <p className="text-zinc-500">
                Platform: <span className="font-medium text-zinc-700">{shop.agent?.platform || "—"}</span>
              </p>
              <p className="text-zinc-500">
                Last Heartbeat:{" "}
                <span className="font-medium text-zinc-700">
                  {shop.agent?.last_heartbeat
                    ? new Date(shop.agent.last_heartbeat).toLocaleTimeString("en-IN")
                    : "Never"}
                </span>
              </p>
            </div>

            {/* Printer Details */}
            <div className="bg-zinc-50 p-3 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-zinc-500" />
                  Printers Configured
                </span>
                <span className="font-bold text-zinc-800">
                  {shop.printers?.length ?? 0}
                </span>
              </div>
              {shop.printers && shop.printers.length > 0 ? (
                <div className="space-y-1 pt-1">
                  {shop.printers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-zinc-700">
                      <span className="font-medium truncate max-w-[150px]">{p.os_printer_name}</span>
                      <div className="flex gap-1 text-[10px]">
                        {p.supports_color && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                            Color
                          </span>
                        )}
                        {p.supports_duplex && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                            Duplex
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 italic text-[11px] pt-1">
                  {shop.virtual_mode ? "Virtual spooler active" : "No printer connected yet"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 4. Bank & Lifetime Analytics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-zinc-900">Bank Verification</h3>
              </div>
              {shop.bank?.verified ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold">
                  <XCircle className="w-3.5 h-3.5" />
                  {shop.bank ? "Pending" : "Not Provided"}
                </span>
              )}
            </div>
            <div className="space-y-1 text-xs text-zinc-600">
              <p>
                Bank: <span className="font-medium text-zinc-800">{shop.bank?.bank_name || "—"}</span>
              </p>
              <p>
                Holder: <span className="font-medium text-zinc-800">{shop.bank?.account_holder_name || "—"}</span>
              </p>
              {shop.bank?.ifsc && (
                <p>
                  IFSC: <span className="font-mono font-medium text-zinc-800">{shop.bank.ifsc}</span>
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-zinc-900">Lifetime Performance</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-50 p-2.5 rounded-lg">
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">Pages Printed</span>
                <span className="text-base font-bold text-zinc-900">
                  {(shop.stats?.prints ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="bg-zinc-50 p-2.5 rounded-lg">
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">Revenue</span>
                <span className="text-base font-bold text-zinc-900">
                  {formatPaise(shop.stats?.revenue_paise ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <Mail className="w-3.5 h-3.5" />
                Send Email
              </a>
            )}
            <a
              href={`/s/${shop.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Customer Page
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
