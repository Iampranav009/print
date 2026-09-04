"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, ChevronRight, AlertCircle, Wifi, Usb, Globe } from "lucide-react";

export type ConnectionType = "wifi" | "usb" | "network";

export interface PrinterSavedConfig {
  connection_type?: ConnectionType | null;
  host?: string | null;
  port?: number | null;
  wifi_ssid?: string | null;
  os_printer_name?: string | null;
}

interface PrinterConfigModalProps {
  open: boolean;
  onClose: () => void;
  savedConfig?: PrinterSavedConfig | null;
  onSaved: () => Promise<void>;
}

export function PrinterConfigModal({
  open,
  onClose,
  savedConfig,
  onSaved,
}: PrinterConfigModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Active tab: Wi-Fi | USB | Network
  const [activeTab, setActiveTab] = useState<ConnectionType>("wifi");

  // Wi-Fi fields
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiIp, setWifiIp] = useState("");
  const [wifiPort, setWifiPort] = useState<number>(9100);

  // USB fields
  const [osPrinterName, setOsPrinterName] = useState("");

  // Network fields
  const [networkHost, setNetworkHost] = useState("");
  const [networkPort, setNetworkPort] = useState<number>(9100);

  // Accordion state
  const [accordionOpen, setAccordionOpen] = useState(false);

  // Submission state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate from savedConfig when opened
  useEffect(() => {
    if (open) {
      setError(null);
      setAccordionOpen(false);

      const conn = savedConfig?.connection_type;
      if (conn === "usb" || conn === "network" || conn === "wifi") {
        setActiveTab(conn);
      } else {
        setActiveTab("wifi");
      }

      setWifiSsid(savedConfig?.wifi_ssid ?? "");
      setWifiIp(savedConfig?.connection_type === "wifi" ? (savedConfig?.host ?? "") : "");
      setWifiPort(savedConfig?.connection_type === "wifi" && savedConfig?.port ? savedConfig.port : 9100);

      setOsPrinterName(savedConfig?.os_printer_name ?? "");

      setNetworkHost(savedConfig?.connection_type === "network" ? (savedConfig?.host ?? "") : "");
      setNetworkPort(savedConfig?.connection_type === "network" && savedConfig?.port ? savedConfig.port : 9100);
    }
  }, [open, savedConfig]);

  // Close on Escape & trap focus
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }, [open]);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let payload: {
      connection_type: ConnectionType;
      host: string | null;
      port: number | null;
      wifi_ssid: string | null;
      os_printer_name: string | null;
    };

    if (activeTab === "wifi") {
      const trimmedIp = wifiIp.trim();
      if (!trimmedIp) {
        setError("Please enter your printer's IP address.");
        return;
      }
      payload = {
        connection_type: "wifi",
        host: trimmedIp,
        port: Number(wifiPort) || 9100,
        wifi_ssid: wifiSsid.trim() || null,
        os_printer_name: null,
      };
    } else if (activeTab === "usb") {
      const trimmedName = osPrinterName.trim();
      if (!trimmedName) {
        setError("Please enter the OS printer name as seen in your system settings.");
        return;
      }
      payload = {
        connection_type: "usb",
        host: null,
        port: null,
        wifi_ssid: null,
        os_printer_name: trimmedName,
      };
    } else {
      const trimmedHost = networkHost.trim();
      if (!trimmedHost) {
        setError("Please enter your printer's network IP address or hostname.");
        return;
      }
      payload = {
        connection_type: "network",
        host: trimmedHost,
        port: Number(networkPort) || 9100,
        wifi_ssid: null,
        os_printer_name: null,
      };
    }

    setSaving(true);
    try {
      const res = await fetch("/api/vendor/printer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save configuration. Please check your inputs and try again.");
      }

      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-printer-config-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div
        ref={dialogRef}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-[560px] p-6 sm:p-8 max-h-[92vh] overflow-y-auto space-y-6 select-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-printer-config-title" className="text-xl font-bold text-zinc-900 tracking-tight">
              Configure printer
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Choose how your printer connects to PrintBuddy.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inline Error Banner */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 animate-in fade-in duration-200 select-text"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1 leading-snug">{error}</div>
          </div>
        )}

        {/* Tab Segmented Control */}
        <div
          role="tablist"
          aria-label="Connection type"
          className="bg-zinc-100 p-1 rounded-2xl flex items-center gap-1 border border-zinc-200/50"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "wifi"}
            onClick={() => {
              setActiveTab("wifi");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              activeTab === "wifi"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>Wi-Fi</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "usb"}
            onClick={() => {
              setActiveTab("usb");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              activeTab === "usb"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Usb className="w-4 h-4" />
            <span>USB</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "network"}
            onClick={() => {
              setActiveTab("network");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              activeTab === "network"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Network</span>
          </button>
        </div>

        {/* Tab Content & Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. Wi-Fi Tab */}
          {activeTab === "wifi" && (
            <div className="space-y-4 text-left">
              <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3.5 rounded-xl border border-zinc-100">
                Most modern printers can be joined to your shop&apos;s Wi-Fi from their front panel. Once joined, they show an IP address on the settings screen — enter it below.
              </p>

              <div className="space-y-1.5">
                <label htmlFor="wifi-ssid" className="block text-xs font-semibold text-zinc-700">
                  Wi-Fi network name (SSID) <span className="text-zinc-400 font-normal">(optional reference)</span>
                </label>
                <input
                  id="wifi-ssid"
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="e.g. Shop_5G_Guest"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label htmlFor="wifi-ip" className="block text-xs font-semibold text-zinc-700">
                    Printer IP address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="wifi-ip"
                    type="text"
                    required
                    value={wifiIp}
                    onChange={(e) => setWifiIp(e.target.value)}
                    placeholder="192.168.1.42"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="wifi-port" className="block text-xs font-semibold text-zinc-700">
                    Port
                  </label>
                  <input
                    id="wifi-port"
                    type="number"
                    value={wifiPort}
                    onChange={(e) => setWifiPort(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">
                9100 is the standard raw JetDirect port used by nearly every network-capable printer.
              </p>

              {/* Accordion */}
              <div className="pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setAccordionOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-700 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg"
                  aria-expanded={accordionOpen}
                >
                  <span>How to find your printer&apos;s IP</span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform duration-200 ${
                      accordionOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {accordionOpen && (
                  <div className="mt-2.5 p-3.5 bg-zinc-50 rounded-xl border border-zinc-100 text-xs text-zinc-600 space-y-2 animate-in fade-in duration-150">
                    <ul className="list-disc pl-4 space-y-1.5">
                      <li>Look at the printer&apos;s front panel ? Settings ? Network ? check the IPv4 address.</li>
                      <li><strong>HP printers:</strong> Press the wireless button, then the info button.</li>
                      <li><strong>Canon / Epson:</strong> Settings ? Network Status ? Print Status Sheet.</li>
                      <li><strong>Brother:</strong> Menu ? Network ? TCP/IP ? IP Address.</li>
                      <li>If you don&apos;t see one, the printer isn&apos;t joined to Wi-Fi yet — do that first from the printer&apos;s own menu.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. USB Tab */}
          {activeTab === "usb" && (
            <div className="space-y-4 text-left">
              <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3.5 rounded-xl border border-zinc-100">
                For a printer plugged into a PC or Raspberry Pi over USB. You&apos;ll need to run the PrintBuddy Agent app on that machine — it forwards jobs to the printer over your OS&apos;s print system.
              </p>

              <div className="space-y-1.5">
                <label htmlFor="os-printer-name" className="block text-xs font-semibold text-zinc-700">
                  OS printer name <span className="text-red-500">*</span>
                </label>
                <input
                  id="os-printer-name"
                  type="text"
                  required
                  value={osPrinterName}
                  onChange={(e) => setOsPrinterName(e.target.value)}
                  placeholder="HP_LaserJet_Pro_MFP_M148fw"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                />
                <p className="text-[11px] text-zinc-400 leading-normal">
                  The exact name your operating system uses for the printer. Windows: Control Panel ? Devices and Printers. macOS: System Settings ? Printers &amp; Scanners. Linux: <code className="bg-zinc-100 px-1 py-0.5 rounded">lpstat -p</code>.
                </p>
              </div>

              {/* USB Instructions Block */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2 text-xs text-indigo-900">
                <p className="font-semibold text-indigo-950">How to set up the PrintBuddy Agent:</p>
                <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed text-indigo-800">
                  <li>
                    Install the PrintBuddy Agent (
                    <Link
                      href="/vendor/agent-download"
                      className="text-indigo-600 font-semibold underline underline-offset-2 hover:text-indigo-800"
                    >
                      download agent app
                    </Link>
                    ).
                  </li>
                  <li>
                    When it starts, paste in the shop&apos;s Agent Token (visible in your Shop settings) and click Connect.
                  </li>
                  <li>
                    The agent runs quietly in the background, sends heartbeats every 30 seconds, and forwards paid print jobs to the OS printer above.
                  </li>
                  <li>
                    Back on this page, click Verify connectivity — the status pill should turn green.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* 3. Network Tab */}
          {activeTab === "network" && (
            <div className="space-y-4 text-left">
              <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3.5 rounded-xl border border-zinc-100">
                For enterprise or shared network printers that already sit on your LAN with a static IP.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label htmlFor="network-host" className="block text-xs font-semibold text-zinc-700">
                    IP address or hostname <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="network-host"
                    type="text"
                    required
                    value={networkHost}
                    onChange={(e) => setNetworkHost(e.target.value)}
                    placeholder="printer.shop.local or 10.0.0.15"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="network-port" className="block text-xs font-semibold text-zinc-700">
                    Port
                  </label>
                  <input
                    id="network-port"
                    type="number"
                    value={networkPort}
                    onChange={(e) => setNetworkPort(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                  />
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                If your network printer uses a different protocol (LPD, IPP), let PrintBuddy support know and we&apos;ll add support.
              </p>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50 active:bg-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                "Save configuration"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
