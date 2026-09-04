"use client";

import { useState, useCallback } from "react";
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

export function PrinterClient({ initialData }: PrinterClientProps) {
  const [data, setData] = useState(initialData);
  const [mode, setMode] = useState<"test" | "real">(
    data.status?.mode ?? (data.shop?.virtual_mode ? "test" : "real")
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      }
    } catch {
      // ignore
    }
  }, []);

  // Mode toggle handler
  const handleModeChange = async (newMode: "test" | "real") => {
    if (newMode === mode) return;

    // Optimistic update
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
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      // Success — refresh from the server so status.mode reflects reality.
      // Any partial-schema warning bubbles up as a soft toast so the vendor
      // knows to run migration 0016 if it hasn't been applied yet.
      if (json.warning) showToast(json.warning);
      await refreshData();
    } catch (err) {
      // Revert
      setMode(previousMode);
      await refreshData();
      const msg = err instanceof Error ? err.message : "Please try again.";
      showToast(`Could not switch mode: ${msg}`);
    }
  };

  // Verify connectivity handler
  const handleVerify = useCallback(async () => {
    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch("/api/vendor/printer/verify", {
        method: "POST",
      });
      const json = await res.json();
      setVerifyResult({
        ok: !!json.ok,
        message: json.message ?? (json.ok ? "Printer is reachable." : (json.error ?? "Could not connect to printer.")),
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
    // Auto-trigger verify call
    void handleVerify();
  };

  const printer = data.printer;
  const isConfigured = Boolean(printer?.connection_type);
  const isOnline = Boolean(data.status?.online);

  // Derived pill status
  const currentStatusData: PrinterStatusData = {
    mode,
    online: isOnline,
    connection_type: printer?.connection_type ?? null,
    last_seen_at: data.status?.last_seen_at ?? null,
  };

  // Connectivity card subtitle
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

      {/* 2. Connectivity Card (Shown ONLY when mode === "real") */}
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

      {/* 3. Setup guide (Shown ONLY when mode === "real" and no config yet) */}
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
        agentToken={data.agent?.agent_token}
        shopId={data.shop?.id}
        onSaved={handleModalSaved}
      />
    </div>
  );
}
