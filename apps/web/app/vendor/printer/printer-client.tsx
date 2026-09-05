"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Printer as PrinterIcon,
  CheckCircle2,
  XCircle,
  Wifi,
  Usb,
  Globe,
  Settings2,
  RefreshCw,
  HelpCircle,
  Palette,
  Copy as CopyIcon,
  RotateCcw,
  IndianRupee,
} from "lucide-react";
import { PrinterModeToggle } from "@/components/vendor/PrinterModeToggle";
import { PrinterConfigModal } from "@/components/vendor/PrinterConfigModal";
import { type PrinterStatusData } from "@/components/vendor/PrinterStatusPill";
import { formatRelativeTime } from "@/lib/date-utils";

export interface PrinterClientProps {
  initialData: {
    shop: { id: string; name: string; virtual_mode: boolean };
    printer: {
      id: string;
      os_printer_name: string | null;
      mode: "test" | "real";
      connection_type: "wifi" | "usb" | "network" | null;
      host: string | null;
      port: number | null;
      wifi_ssid: string | null;
      setup_notes: string | null;
      last_seen_at: string | null;
      online: boolean;
      color_enabled?: boolean;
      duplex_enabled?: boolean;
      discovered_printers?: Array<{ name: string; driver?: string; is_default?: boolean }>;
      discovered_at?: string | null;
    } | null;
    agent?: {
      id: string;
      agent_token?: string;
      status: string;
      last_heartbeat: string | null;
      platform: string | null;
    } | null;
    status: {
      mode: "test" | "real";
      online: boolean;
      last_seen_at: string | null;
      heartbeat_window_seconds: number;
    };
  };
}

interface VerifyResult {
  ok: boolean;
  message: string;
}

interface PricingFields {
  bw_page_paise: number;
  color_page_paise: number;
  duplex_factor: number;
  a3_multiplier: number;
  min_charge_paise: number;
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Live example price preview for 5-page A4 B&W simplex job
function pricePreview(pricing: PricingFields): string {
  const pages = 5;
  const raw = pages * pricing.bw_page_paise;
  const total = Math.max(raw, pricing.min_charge_paise);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(total / 100);
}

export function PrinterClient({ initialData }: PrinterClientProps) {
  const [data, setData] = useState(initialData);
  const [mode, setMode] = useState<"test" | "real">(
    data.status?.mode ?? (data.shop?.virtual_mode ? "test" : "real")
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Feature toggles
  const [colorEnabled, setColorEnabled] = useState<boolean>(
    data.printer?.color_enabled ?? false
  );
  const [duplexEnabled, setDuplexEnabled] = useState<boolean>(
    data.printer?.duplex_enabled ?? false
  );
  const [togglingColor, setTogglingColor] = useState(false);
  const [togglingDuplex, setTogglingDuplex] = useState(false);

  // Pricing
  const [pricing, setPricing] = useState<PricingFields>({
    bw_page_paise: 200,
    color_page_paise: 1000,
    duplex_factor: 1.0,
    a3_multiplier: 2.0,
    min_charge_paise: 300,
  });
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingDirty, setPricingDirty] = useState(false);
  const savedPricingRef = useRef<PricingFields>(pricing);

  // Fetch pricing on mount
  useEffect(() => {
    fetch("/api/vendor/pricing")
      .then((r) => r.json())
      .then((d: { pricing: PricingFields }) => {
        const p = d.pricing ?? d; // unwrap nested .pricing key
        setPricing(p);
        savedPricingRef.current = p;
      })
      .catch(() => {})
      .finally(() => setPricingLoading(false));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  }, []);

  // Refresh data from GET /api/vendor/printer
  const refreshData = useCallback(async () => {
    try {
      const res = await fetch("/api/vendor/printer");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setMode(json.status?.mode ?? (json.shop?.virtual_mode ? "test" : "real"));
        setColorEnabled(json.printer?.color_enabled ?? false);
        setDuplexEnabled(json.printer?.duplex_enabled ?? false);
      }
    } catch {
      // ignore
    }
  }, []);

  // Mode toggle handler
  const handleModeChange = async (newMode: "test" | "real") => {
    if (newMode === mode) return;

    const previousMode = mode;
    setMode(newMode);
    setData((prev) => ({
      ...prev,
      status: {
        ...prev.status,
        mode: newMode,
        online: newMode === "test" ? true : prev.status.online,
      },
      printer: prev.printer ? { ...prev.printer, mode: newMode } : null,
    }));
    showToast(newMode === "test" ? "Switched to test mode" : "Switched to real mode");

    try {
      const res = await fetch("/api/vendor/printer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (json.warning) showToast(json.warning);
      await refreshData();
    } catch (err) {
      setMode(previousMode);
      await refreshData();
      const msg = err instanceof Error ? err.message : "Please try again.";
      showToast(`Could not switch mode: ${msg}`);
    }
  };

  // Feature toggle handler (debounced 400ms)
  const featureDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleFeatureToggle = useCallback(
    (field: "color_enabled" | "duplex_enabled", value: boolean) => {
      if (field === "color_enabled") {
        setColorEnabled(value);
        setTogglingColor(true);
      } else {
        setDuplexEnabled(value);
        setTogglingDuplex(true);
      }

      if (featureDebounceRef.current) clearTimeout(featureDebounceRef.current);
      featureDebounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/vendor/printer", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: value }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
          showToast(
            field === "color_enabled"
              ? value
                ? "Colour printing enabled"
                : "Colour printing disabled"
              : value
                ? "Double-sided printing enabled"
                : "Double-sided printing disabled"
          );
        } catch (err) {
          // Revert
          if (field === "color_enabled") setColorEnabled(!value);
          else setDuplexEnabled(!value);
          showToast(err instanceof Error ? err.message : "Could not update feature toggle.");
        } finally {
          if (field === "color_enabled") setTogglingColor(false);
          else setTogglingDuplex(false);
        }
      }, 400);
    },
    [showToast]
  );

  // Verify connectivity handler
  const handleVerify = useCallback(async () => {
    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch("/api/vendor/printer/verify", { method: "POST" });
      const json = await res.json();
      setVerifyResult({
        ok: !!json.ok,
        message:
          json.message ?? (json.ok ? "Printer is reachable." : (json.error ?? "Could not connect to printer.")),
      });
      await refreshData();
    } catch {
      setVerifyResult({
        ok: false,
        message: "Failed to connect to PrintBuddy verification service. Please retry.",
      });
    } finally {
      setVerifying(false);
    }
  }, [refreshData]);

  // Modal save success handler
  const handleModalSaved = async () => {
    await refreshData();
    showToast("Printer configuration saved");
    void handleVerify();
  };

  // Pricing save handler
  const handleSavePricing = async () => {
    setPricingSaving(true);
    try {
      const res = await fetch("/api/vendor/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricing),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      savedPricingRef.current = pricing;
      setPricingDirty(false);
      showToast("Pricing saved");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save pricing.");
    } finally {
      setPricingSaving(false);
    }
  };

  const handlePricingChange = (field: keyof PricingFields, rawValue: string) => {
    const value = parseFloat(rawValue);
    if (isNaN(value) || value < 0) return;
    // duplex_factor and a3_multiplier are stored as decimals (e.g. 0.9, 2.0)
    // bw/color/min are stored as paise integers
    const stored =
      field === "duplex_factor" || field === "a3_multiplier"
        ? value
        : Math.round(value * 100);
    setPricing((prev) => ({ ...prev, [field]: stored }));
    setPricingDirty(true);
  };

  const printer = data.printer;
  const isConfigured = Boolean(printer?.connection_type);
  const isOnline = Boolean(data.status?.online);

  const currentStatusData: PrinterStatusData = {
    mode,
    online: isOnline,
    connection_type: printer?.connection_type ?? null,
    last_seen_at: data.status?.last_seen_at ?? null,
  };

  let connectivitySub = "";
  if (!isConfigured) {
    connectivitySub = "No connection details saved. Configure the printer to start receiving jobs.";
  } else if (isOnline) {
    const timeStr = data.status?.last_seen_at
      ? formatRelativeTime(data.status.last_seen_at)
      : "recently";
    connectivitySub = `Printer is online. Last seen ${timeStr}.`;
  } else {
    connectivitySub = "Printer isn't responding. Check power, cable and network, then retry.";
  }

  const discoveredPrinters = printer?.discovered_printers ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Toast notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-zinc-900 text-white text-sm font-medium shadow-2xl animate-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Mode Card */}
      <PrinterModeToggle
        mode={mode}
        status={currentStatusData}
        onModeChange={handleModeChange}
      />

      {/* 2. What customers can print (feature toggles) — shown when mode === "real" */}
      {mode === "real" && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">What customers can print</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Control which print capabilities are offered to customers.
            </p>
          </div>

          <div className="space-y-3">
            {/* B&W — always on */}
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-zinc-50 border border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center">
                  <CopyIcon className="w-4 h-4 text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Black &amp; White</p>
                  <p className="text-xs text-zinc-500">Always available to customers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-medium">Always on</span>
                <div className="w-10 h-5 rounded-full bg-indigo-600 opacity-50 flex items-center justify-end px-0.5 cursor-not-allowed">
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            </div>

            {/* Colour */}
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-zinc-50 border border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Colour</p>
                  <p className="text-xs text-zinc-500">Show colour option in the customer app</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={colorEnabled}
                disabled={togglingColor}
                onClick={() => handleFeatureToggle("color_enabled", !colorEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-60 ${
                  colorEnabled ? "bg-indigo-600" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    colorEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Double-sided */}
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-zinc-50 border border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Double-sided</p>
                  <p className="text-xs text-zinc-500">Allow duplex printing for customers</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={duplexEnabled}
                disabled={togglingDuplex}
                onClick={() => handleFeatureToggle("duplex_enabled", !duplexEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-60 ${
                  duplexEnabled ? "bg-indigo-600" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    duplexEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Connectivity Card (shown when mode === "real") */}
      {mode === "real" && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-900">Connectivity</h2>
                {isConfigured && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isOnline
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                      }`}
                    />
                    {isOnline ? "Online" : "Offline"}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                {connectivitySub}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              <Settings2 className="w-4 h-4" />
              <span>Configure printer</span>
            </button>

            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50 active:bg-zinc-100 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${verifying ? "animate-spin text-indigo-600" : ""}`} />
              <span>{verifying ? "Verifying..." : "Verify connectivity"}</span>
            </button>
          </div>

          {/* Live inline verification result */}
          {verifyResult && (
            <div
              role="alert"
              className={`p-4 rounded-2xl text-sm flex items-start gap-3 transition-all animate-in fade-in duration-200 ${
                verifyResult.ok
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-red-50 border border-red-200 text-red-900"
              }`}
            >
              {verifyResult.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-snug">
                <p className="font-semibold">{verifyResult.ok ? "Connected" : "Connection failed"}</p>
                <p className="text-xs mt-0.5 opacity-90">{verifyResult.message}</p>
              </div>
            </div>
          )}

          {/* Saved details definition list */}
          <div className="pt-2 border-t border-zinc-100">
            {isConfigured ? (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Current Settings
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                  <div>
                    <dt className="text-xs text-zinc-400 font-medium">Connection type</dt>
                    <dd className="font-medium text-zinc-900 mt-0.5 flex items-center gap-1.5">
                      {printer?.connection_type === "wifi" && <Wifi className="w-4 h-4 text-zinc-500" />}
                      {printer?.connection_type === "usb" && <Usb className="w-4 h-4 text-zinc-500" />}
                      {printer?.connection_type === "network" && <Globe className="w-4 h-4 text-zinc-500" />}
                      <span className="capitalize">{printer?.connection_type ?? "—"}</span>
                    </dd>
                  </div>

                  {(printer?.connection_type === "wifi" || printer?.connection_type === "network") && (
                    <>
                      <div>
                        <dt className="text-xs text-zinc-400 font-medium">Host / IP</dt>
                        <dd className="font-mono text-xs text-zinc-900 font-medium mt-0.5">
                          {printer?.host ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-400 font-medium">Port</dt>
                        <dd className="font-mono text-xs text-zinc-900 font-medium mt-0.5">
                          {printer?.port ?? 9100}
                        </dd>
                      </div>
                    </>
                  )}

                  {printer?.connection_type === "wifi" && printer?.wifi_ssid && (
                    <div>
                      <dt className="text-xs text-zinc-400 font-medium">Wi-Fi network (SSID)</dt>
                      <dd className="font-medium text-zinc-900 mt-0.5">
                        {printer.wifi_ssid}
                      </dd>
                    </div>
                  )}

                  {printer?.connection_type === "usb" && (
                    <div>
                      <dt className="text-xs text-zinc-400 font-medium">OS printer name</dt>
                      <dd className="font-mono text-xs text-zinc-900 font-medium mt-0.5">
                        {printer?.os_printer_name ?? "—"}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                <HelpCircle className="w-4 h-4 text-zinc-300" />
                <span>No hardware connection saved yet. Click &ldquo;Configure printer&rdquo; to connect.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Pricing Card */}
      {mode === "real" && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Pricing</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Set per-page rates for your shop. Changes apply to all new jobs.
            </p>
          </div>

          {pricingLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-zinc-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* B&W */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700">
                    B&amp;W per page (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(pricing.bw_page_paise / 100).toFixed(2)}
                      onChange={(e) => handlePricingChange("bw_page_paise", e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Colour */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Colour per page (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(pricing.color_page_paise / 100).toFixed(2)}
                      onChange={(e) => handlePricingChange("color_page_paise", e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Duplex factor */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Duplex factor (multiplier)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="2"
                    value={pricing.duplex_factor.toFixed(2)}
                    onChange={(e) => handlePricingChange("duplex_factor", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                  />
                  <p className="text-[11px] text-zinc-400">0.9 = 10% cheaper per side; 1.0 = no discount</p>
                </div>

                {/* A3 multiplier */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700">
                    A3 multiplier
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={pricing.a3_multiplier.toFixed(2)}
                    onChange={(e) => handlePricingChange("a3_multiplier", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                  />
                  <p className="text-[11px] text-zinc-400">e.g. 2.0 means A3 costs 2× the A4 rate</p>
                </div>

                {/* Min charge */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Minimum charge per job (₹)
                  </label>
                  <div className="relative sm:max-w-xs">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(pricing.min_charge_paise / 100).toFixed(2)}
                      onChange={(e) => handlePricingChange("min_charge_paise", e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Live price preview */}
              <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <p className="text-xs text-zinc-500">
                  Example: 5-page A4 B&amp;W simplex job →{" "}
                  <span className="font-semibold text-zinc-800">{pricePreview(pricing)}</span>
                </p>
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={pricingSaving || !pricingDirty}
                  onClick={handleSavePricing}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {pricingSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save pricing"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. Setup guide (shown when mode === "real" and no config yet) */}
      {mode === "real" && !isConfigured && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <PrinterIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Setup guide</h3>
              <p className="text-xs text-zinc-500">Connect your shop printer in 3 quick steps</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                1
              </span>
              <p className="text-sm font-semibold text-zinc-900">Pick connection method</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Wi-Fi is easiest for modern printers, USB for older ones plugged into a PC.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                2
              </span>
              <p className="text-sm font-semibold text-zinc-900">Note printer IP / name</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Visible on printer&apos;s touchscreen or in Windows Print Spooler / macOS Printers &amp; Scanners.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                3
              </span>
              <p className="text-sm font-semibold text-zinc-900">Enter in Configuration</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Click &ldquo;Configure printer&rdquo; above and paste your details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Printer Configuration Modal */}
      <PrinterConfigModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        savedConfig={{
          connection_type: printer?.connection_type,
          host: printer?.host,
          port: printer?.port,
          wifi_ssid: printer?.wifi_ssid,
          os_printer_name: printer?.os_printer_name,
        }}
        discoveredPrinters={discoveredPrinters}
        discoveredAt={printer?.discovered_at ?? null}
        agentToken={data.agent?.agent_token}
        shopId={data.shop?.id}
        onSaved={handleModalSaved}
      />
    </div>
  );
}
