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
  Volume2,
  Banknote,
  CreditCard,
} from "lucide-react";
import { PrinterAssignments } from "@/components/vendor/PrinterAssignments";
import { PrinterModeToggle } from "@/components/vendor/PrinterModeToggle";
import { PrinterConfigModal } from "@/components/vendor/PrinterConfigModal";
import { type PrinterStatusData } from "@/components/vendor/PrinterStatusPill";
import { formatRelativeTime } from "@/lib/date-utils";

interface SoundSettings {
  enabled: boolean;
  language: string;
  volume: number;
}

export interface PrinterClientProps {
  initialData: {
    discovered_printers?: Array<{ name: string; driver?: string; is_default?: boolean }>;
    discovered_at?: string | null;
    shop: { id: string; name: string; virtual_mode: boolean; cash_payments_enabled?: boolean; default_payment_method?: "online" | "cash"; online_payments_enabled?: boolean };
    soundSettings?: SoundSettings;
    printer: {
      id: string;
      os_printer_name: string | null;
      bw_os_printer_name?: string | null;
      color_os_printer_name?: string | null;
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
      agent_connected?: boolean;
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

function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

// Live example price preview
function pricePreview(pricing: PricingFields): { simplex: string; duplex: string } {
  const pages = 5;
  const simplexRaw = pages * pricing.bw_page_paise;
  const simplex = formatINR(Math.max(simplexRaw, pricing.min_charge_paise));
  // 5 pages duplex: 2 sheets (4 pages) at discount + 1 single-sided page
  const duplexRaw = 4 * pricing.bw_page_paise * pricing.duplex_factor + pricing.bw_page_paise;
  const duplex = formatINR(Math.max(duplexRaw, pricing.min_charge_paise));
  return { simplex, duplex };
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

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    data.soundSettings?.enabled ?? false
  );
  const [soundVolume, setSoundVolume] = useState<number>(
    data.soundSettings?.volume ?? 80
  );
  const [soundLanguage, setSoundLanguage] = useState<string>(
    data.soundSettings?.language ?? "en"
  );
  const [savingSound, setSavingSound] = useState(false);
  const [onlineEnabled, setOnlineEnabled] = useState(data.shop?.online_payments_enabled ?? true);
  const [cashEnabled, setCashEnabled] = useState(data.shop?.cash_payments_enabled ?? false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Pricing
  const [pricing, setPricing] = useState<PricingFields>({
    bw_page_paise: 200,
    color_page_paise: 1000,
    duplex_factor: 0.75,
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
      .then((d: { pricing: PricingFields & { a3_multiplier?: number } }) => {
        const raw = d.pricing ?? d;
        const { a3_multiplier: _ignored, ...p } = raw as typeof raw;
        setPricing(p as PricingFields);
        savedPricingRef.current = p as PricingFields;
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
        setOnlineEnabled(json.shop?.online_payments_enabled ?? true);
        setCashEnabled(json.shop?.cash_payments_enabled ?? false);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => { void refreshData(); }, 5000);
    return () => clearInterval(timer);
  }, [refreshData]);

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
        message: "Failed to connect to HIMMER verification service. Please retry.",
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

  const handleSoundToggle = async (value: boolean) => {
    const previous = soundEnabled;
    setSoundEnabled(value);
    setSavingSound(true);
    try {
      const res = await fetch("/api/vendor/printer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sound_enabled: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      showToast(value ? "Voice announcements enabled" : "Voice announcements disabled");
    } catch (err) {
      setSoundEnabled(previous);
      showToast(err instanceof Error ? err.message : "Could not update sound setting.");
    } finally {
      setSavingSound(false);
    }
  };

  const savePaymentToggle = async (field: "online_payments_enabled" | "cash_payments_enabled", value: boolean) => {
    const prevOnline = onlineEnabled;
    const prevCash = cashEnabled;
    if (field === "online_payments_enabled") setOnlineEnabled(value);
    else setCashEnabled(value);
    setSavingPayment(true);
    try {
      const res = await fetch("/api/vendor/printer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save payment settings");
      showToast("Payment settings saved");
    } catch (err) {
      setOnlineEnabled(prevOnline);
      setCashEnabled(prevCash);
      showToast(err instanceof Error ? err.message : "Could not save payment settings");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSoundSettings = async (patch: Partial<{ sound_volume: number; sound_language: string }>) => {
    if (patch.sound_volume !== undefined) setSoundVolume(patch.sound_volume);
    if (patch.sound_language !== undefined) setSoundLanguage(patch.sound_language);
    try {
      await fetch("/api/vendor/printer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      // best effort; the operator can retry
    }
  };

  const handlePricingChange = (field: keyof PricingFields, rawValue: string) => {
    const value = parseFloat(rawValue);
    if (isNaN(value) || value < 0) return;
    // duplex_factor is stored as a decimal (e.g. 0.75)
    // bw/color/min are stored as paise integers
    const stored = field === "duplex_factor" ? value : Math.round(value * 100);
    setPricing((prev) => ({ ...prev, [field]: stored }));
    setPricingDirty(true);
  };

  const printer = data.printer;
  const isConfigured = Boolean(printer?.bw_os_printer_name || printer?.os_printer_name);
  const isOnline = Boolean(data.status?.online);

  const currentStatusData: PrinterStatusData = {
    mode,
    online: isOnline,
    connection_type: printer?.connection_type ?? null,
    printer_name: printer?.bw_os_printer_name || printer?.os_printer_name || null,
    agent_connected: data.status?.agent_connected,
    last_seen_at: data.status?.last_seen_at ?? null,
  };

  let connectivitySub = "";
  if (!isConfigured) {
    connectivitySub = "Choose your black-and-white and color printers above to start receiving jobs.";
  } else if (isOnline) {
    const timeStr = data.status?.last_seen_at
      ? formatRelativeTime(data.status.last_seen_at)
      : "recently";
    connectivitySub = `Printer is online. Last seen ${timeStr}.`;
  } else {
    connectivitySub = "Printer isn't responding. Check power, cable and network, then retry.";
  }

  const discoveredPrinters = data.discovered_printers ?? printer?.discovered_printers ?? [];

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

      <PrinterAssignments
        key={`${printer?.bw_os_printer_name ?? printer?.os_printer_name}-${printer?.color_os_printer_name ?? printer?.os_printer_name}`}
        printers={discoveredPrinters}
        bw={printer?.bw_os_printer_name ?? printer?.os_printer_name ?? ""}
        color={printer?.color_os_printer_name ?? printer?.os_printer_name ?? ""}
        discoveredAt={data.discovered_at ?? printer?.discovered_at ?? null}
        onSaved={refreshData}
      />

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
                aria-label="Allow colour printing" aria-checked={colorEnabled}
                disabled={togglingColor}
                onClick={() => handleFeatureToggle("color_enabled", !colorEnabled)}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-60 ${
                  colorEnabled ? "bg-indigo-600" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`absolute left-0 top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    colorEnabled ? "translate-x-6" : "translate-x-1"
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
                aria-label="Allow double-sided printing" aria-checked={duplexEnabled}
                disabled={togglingDuplex}
                onClick={() => handleFeatureToggle("duplex_enabled", !duplexEnabled)}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-60 ${
                  duplexEnabled ? "bg-indigo-600" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`absolute left-0 top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    duplexEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "real" && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Customer payments</h2>
            <p className="text-sm text-zinc-500 mt-1">Choose which payment methods customers can use at this shop.</p>
          </div>

          <div className="space-y-3">
            {/* Online (Cashfree UPI) — toggleable */}
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-zinc-50 border border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Online (Cashfree UPI)</p>
                  <p className="text-xs text-zinc-500">Payment confirmed automatically before job releases</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Accept online payments"
                aria-checked={onlineEnabled}
                disabled={savingPayment}
                onClick={() => void savePaymentToggle("online_payments_enabled", !onlineEnabled)}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-60 ${onlineEnabled ? "bg-indigo-600" : "bg-zinc-300"}`}
              >
                <span className={`absolute left-0 top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${onlineEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Cash — toggleable */}
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-zinc-50 border border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Cash at counter</p>
                  <p className="text-xs text-zinc-500">Job waits until shop confirms payment received</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Accept cash payments"
                aria-checked={cashEnabled}
                disabled={savingPayment}
                onClick={() => void savePaymentToggle("cash_payments_enabled", !cashEnabled)}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-60 ${cashEnabled ? "bg-indigo-600" : "bg-zinc-300"}`}
              >
                <span className={`absolute left-0 top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${cashEnabled ? "translate-x-6" : "translate-x-1"}`} />
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
              className="inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              <Settings2 className="w-4 h-4" />
              <span>Advanced connection details</span>
            </button>

            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              className="inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50 active:bg-zinc-100 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50"
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
              {[...Array(4)].map((_, i) => (
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

                {/* Duplex discount */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Double-sided discount (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="90"
                      value={Math.round((1 - pricing.duplex_factor) * 100)}
                      onChange={(e) => {
                        const pct = Math.min(90, Math.max(0, parseInt(e.target.value, 10) || 0));
                        handlePricingChange("duplex_factor", String((100 - pct) / 100));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Discount per page when printing double-sided. e.g. 25% = both sides of a sheet cost 25% less each.
                    {pricing.bw_page_paise > 0 && (
                      <> With ₹{(pricing.bw_page_paise / 100).toFixed(2)}/page B&amp;W, a duplex sheet costs ₹{(2 * pricing.bw_page_paise * pricing.duplex_factor / 100).toFixed(2)}.</>
                    )}
                  </p>
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
              <div className="px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                <p className="text-xs text-zinc-500">
                  5-page B&amp;W single-sided →{" "}
                  <span className="font-semibold text-zinc-800">{pricePreview(pricing).simplex}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  5-page B&amp;W double-sided →{" "}
                  <span className="font-semibold text-zinc-800">{pricePreview(pricing).duplex}</span>
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

      {/* 5. Voice Announcements Card */}
      {mode === "real" && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Voice announcements</h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  A speaker plugged into the agent PC announces payments and print events aloud.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Voice announcements" aria-checked={soundEnabled}
              disabled={savingSound}
              onClick={() => handleSoundToggle(!soundEnabled)}
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-60 ${
                soundEnabled ? "bg-indigo-600" : "bg-zinc-300"
              }`}
            >
              <span
                className={`absolute left-0 top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  soundEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {soundEnabled && (
            <div className="space-y-4 pt-1 border-t border-zinc-100">
              {/* Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700">Volume</label>
                  <span className="text-xs font-mono text-zinc-500">{soundVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  onMouseUp={(e) =>
                    void handleSoundSettings({ sound_volume: Number((e.target as HTMLInputElement).value) })
                  }
                  onTouchEnd={(e) =>
                    void handleSoundSettings({ sound_volume: Number((e.target as HTMLInputElement).value) })
                  }
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Language</label>
                <select
                  value={soundLanguage}
                  onChange={(e) => {
                    setSoundLanguage(e.target.value);
                    void handleSoundSettings({ sound_language: e.target.value });
                  }}
                  className="w-full sm:max-w-xs px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="en">English</option>
                  <option value="hi" disabled>Hindi (coming soon)</option>
                </select>
              </div>

              {/* Test announcement button */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!("speechSynthesis" in window)) return;
                    const msg = soundLanguage === "hi"
                      ? "नया प्रिंट जॉब मिला। कृपया अपने प्रिंट एकत्र करें।"
                      : "New print job received. Customer, please collect your prints from the counter.";
                    const utter = new window.SpeechSynthesisUtterance(msg);
                    utter.volume = soundVolume / 100;
                    utter.lang = soundLanguage === "hi" ? "hi-IN" : "en-IN";
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(utter);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50 active:bg-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  Test announcement
                </button>
                <p className="text-xs text-zinc-400">Plays a sample through this browser — the agent uses its own speaker.</p>
              </div>

              <p className="text-xs text-zinc-400">
                Announcements are picked up by the agent within 30 seconds of toggling — no restart needed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 6. Setup guide (shown when mode === "real" and no config yet) */}
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
      {isModalOpen && <PrinterConfigModal
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
        discoveredAt={data.discovered_at ?? printer?.discovered_at ?? null}
        agentToken={data.agent?.agent_token}
        shopId={data.shop?.id}
        onSaved={handleModalSaved}
      />}
    </div>
  );
}
