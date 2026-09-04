"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { PrinterCapabilities, PriceBreakdown } from "@printbuddy/shared";
import {
  ArrowLeft,
  Plus,
  Minus,
  FileText,
  X,
  Upload,
  Loader2,
  AlertCircle,
  Check,
  QrCode,
  ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShopData {
  shop: { id: string; name: string; location: string | null; virtual_mode?: boolean };
  capabilities: PrinterCapabilities | null;
}

interface FileState {
  file: File;
  path: string;
  mime: string;
  totalPages: number;
}

interface Config {
  copies: number;
  color: boolean;
  orientation: "portrait" | "landscape";
  paper: string;
  duplex: boolean;
  duplex_edge: "long" | "short";
  useCustomRange: boolean;
  pageRange: string;
  numberUp: number;
  collate: boolean;
  quality: string;
  mediaType: string;
  reverse: boolean;
  scaling: string;
  finishings: string[];
}

interface PriceResult {
  pricePaise: number;
  breakdown: PriceBreakdown;
}

type RazorpayWindow = Window & {
  Razorpay: new (opts: Record<string, unknown>) => { open(): void };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2)}`;
}

function defaultConfig(caps: PrinterCapabilities | null): Config {
  return {
    copies: 1,
    color: !!(caps?.color),
    orientation: "portrait",
    paper: caps?.media?.[0] ?? "A4",
    duplex: false,
    duplex_edge: "long",
    useCustomRange: false,
    pageRange: "",
    numberUp: 1,
    collate: true,
    quality: "normal",
    mediaType: "plain",
    reverse: false,
    scaling: "fit",
    finishings: [],
  };
}

async function uploadToSignedUrl(
  url: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.send(file);
  });
}

// ── Upload Progress Sheet ─────────────────────────────────────────────────────

function UploadProgressSheet({
  progress,
  success,
  onClose,
}: {
  progress: number;
  success: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* Sheet */}
      <div className="bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          style={{ touchAction: "manipulation" }}
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {success ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Document Successfully Uploaded</h3>
            <p className="text-xs text-rose-500 mt-2">We delete your uploaded files once job is done</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-2">
            {/* Animated doc icon */}
            <div className="w-24 h-24 mb-4 flex items-center justify-center">
              <div className="relative">
                <div className="w-16 h-20 bg-blue-100 rounded-lg border-2 border-blue-200 flex flex-col items-center justify-end pb-3 gap-1">
                  <div className="w-10 h-1.5 bg-blue-300 rounded" />
                  <div className="w-10 h-1.5 bg-blue-300 rounded" />
                  <div className="w-7 h-1.5 bg-blue-300 rounded" />
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Uploading Document</h3>
            <p className="text-xs text-gray-500 mt-1">0/1 files</p>

            {/* Progress bar */}
            <div className="w-full mt-5 mb-2">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700 self-end">{progress}%</p>

            <p className="text-xs text-rose-500 mt-3 font-medium">
              We delete your uploaded files once delivered
            </p>

            <button
              type="button"
              onClick={onClose}
              style={{ touchAction: "manipulation" }}
              className="mt-5 text-sm font-semibold text-gray-700"
            >
              Cancel uploading
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Print Options Card ────────────────────────────────────────────────────────

function OptionPair<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Array<{ value: T; label: string; icon: React.ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-900 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => !disabled && onChange(opt.value)}
              disabled={disabled}
              style={{ touchAction: "manipulation" }}
              className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active
                  ? "border-blue-700 bg-white text-gray-900"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300"
              } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              aria-pressed={active}
            >
              <span className="text-base leading-none">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Print Content ─────────────────────────────────────────────────────────────

function PrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shopId = searchParams.get("shop");

  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);

  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileState, setFileState] = useState<FileState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  const [config, setConfig] = useState<Config | null>(null);
  const [priceState, setPriceState] = useState<"idle" | "fetching" | "ready" | "error">("idle");
  const [rawPriceResult, setRawPriceResult] = useState<PriceResult | null>(null);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Fetch shop
  useEffect(() => {
    const currentShopId = shopId;
    if (!currentShopId) return;
    let active = true;
    async function loadShop() {
      if (!currentShopId) return;
      try {
        const res = await fetch(`/api/shops/${encodeURIComponent(currentShopId)}`);
        if (!res.ok) throw new Error("Shop not found");
        const data: ShopData = await res.json();
        if (!active) return;
        setShopData(data);
        if (data.capabilities) setConfig(defaultConfig(data.capabilities));
      } catch (err: unknown) {
        if (!active) return;
        setShopError(err instanceof Error ? err.message : "Shop not found");
      }
    }
    loadShop();
    return () => { active = false; };
  }, [shopId]);

  // Init config when no shop
  useEffect(() => {
    if (!shopId && !config) setConfig(defaultConfig(null));
  }, [shopId, config]);

  // Fetch price
  const fetchPrice = useCallback(async () => {
    if (!fileState || !config) return;
    setPriceState("fetching");
    setRawPriceResult(null);
    try {
      const body = {
        shopId: shopId ?? "virtual",
        pageCount: config.useCustomRange
          ? Math.max(1, config.pageRange.split(",").reduce((acc, part) => {
              const t = part.trim();
              if (t.includes("-")) {
                const [a, b] = t.split("-").map(Number);
                return acc + (b - a + 1);
              }
              return acc + 1;
            }, 0))
          : fileState.totalPages,
        copies: config.copies,
        color: config.color,
        duplex: config.duplex,
        paper: config.paper,
      };
      const res = await fetch("/api/price-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Could not fetch price");
      const result: PriceResult = await res.json();
      setRawPriceResult(result);
      setPriceState("ready");
    } catch {
      setPriceState("error");
    }
  }, [fileState, config, shopId]);

  useEffect(() => {
    if (fileState && config) fetchPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileState?.path, config?.copies, config?.color, config?.orientation, config?.paper, config?.duplex, config?.useCustomRange, config?.pageRange]);

  // File pick handler
  const handleFileSelect = useCallback(async (file: File) => {
    const ACCEPTED = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (!ACCEPTED.includes(file.type)) {
      setUploadError("Unsupported file type");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File too large (max 50 MB)");
      return;
    }
    setUploadError(null);
    setUploadState("uploading");
    setUploadProgress(0);
    setShowUploadSheet(true);

    try {
      // Get signed upload URL
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type }),
      });
      if (!res.ok) throw new Error("Could not get upload URL");
      const { signedUrl, path, mime } = await res.json() as { signedUrl: string; path: string; mime: string };

      await uploadToSignedUrl(signedUrl, file, setUploadProgress);

      // Get page count
      const countRes = await fetch("/api/uploads/page-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!countRes.ok) throw new Error("Could not count pages");
      const { pageCount } = await countRes.json() as { pageCount: number };

      setFileState({ file, path, mime, totalPages: pageCount });
      setUploadState("done");
      setUploadProgress(100);

      // Auto close after 2s on success
      setTimeout(() => setShowUploadSheet(false), 2000);
    } catch (err: unknown) {
      setUploadState("error");
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setShowUploadSheet(false);
    }
  }, []);

  // Razorpay pay
  const handlePay = useCallback(async () => {
    if (!fileState || !config) return;
    if (rawPriceResult === null) return;
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shopId ?? shopData?.shop.id ?? "virtual",
          filePath: fileState.path,
          fileName: fileState.file.name,
          options: {
            copies: config.copies,
            color: config.color,
            orientation: config.orientation,
            paper: config.paper,
            duplex: config.duplex,
            duplex_edge: config.duplex_edge,
            range: config.useCustomRange ? config.pageRange : null,
            number_up: config.numberUp,
            collate: config.collate,
          },
        }),
      });
      if (!res.ok) throw new Error("Could not create print job");
      const { jobId, orderId, amount, currency, keyId } = await res.json() as {
        jobId: string;
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      };

      const win = window as unknown as RazorpayWindow;
      if (typeof win.Razorpay !== "function") throw new Error("Payment not available");

      const rzp = new win.Razorpay({
        key: keyId,
        order_id: orderId,
        amount,
        currency,
        name: "PrintBuddy",
        description: fileState.file.name,
        prefill: {},
        theme: { color: "#22c55e" },
        handler: () => {
          router.push(`/app/history/${jobId}`);
        },
      });
      rzp.open();
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }, [fileState, config, rawPriceResult, shopId, shopData, router]);

  const caps = shopData?.capabilities ?? null;
  const hasFile = fileState !== null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          style={{ touchAction: "manipulation" }}
          aria-label="Go back"
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>

        <div className="flex items-center gap-2">
          {shopData && (
            <span className="text-xs font-semibold text-gray-500">{shopData.shop.name}</span>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ touchAction: "manipulation" }}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-full px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Shop Error */}
      {shopError && (
        <div className="mx-4 mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{shopError}</span>
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-36">
        {/* Upload zone / File preview */}
        <div className="px-4 pt-4">
          {!hasFile ? (
            /* Upload Drop Zone */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ touchAction: "manipulation" }}
              className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-100 transition-colors p-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
                <Upload className="w-7 h-7 text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">Upload Document</p>
                <p className="text-xs text-gray-500 mt-1">PDF, Word, PowerPoint, Images · up to 50 MB</p>
              </div>
            </button>
          ) : (
            /* Document Preview Card */
            <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Dismiss */}
              <button
                type="button"
                onClick={() => { setFileState(null); setUploadState("idle"); setRawPriceResult(null); setPriceState("idle"); }}
                style={{ touchAction: "manipulation" }}
                className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                aria-label="Remove file"
              >
                <X className="w-3.5 h-3.5 text-gray-600" />
              </button>

              {/* Preview area */}
              <div
                className={`w-full bg-gray-50 flex items-center justify-center ${
                  config?.orientation === "landscape" ? "h-40" : "h-52"
                }`}
              >
                <div className={`bg-white shadow-md rounded flex items-center justify-center text-gray-400 text-xs font-medium ${
                  config?.orientation === "landscape" ? "w-48 h-32" : "w-32 h-44"
                }`}>
                  <div className="text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-[10px] text-gray-400 max-w-[100px] truncate px-2">{fileState.file.name}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Print Options */}
        {config && (
          <div className="mx-4 mt-4 bg-white border border-gray-200 rounded-2xl p-4 space-y-5 shadow-sm">
            {/* Copies row */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Number of copies</p>
                {fileState && (
                  <p className="text-xs text-gray-500 mt-0.5">File 1 ({fileState.totalPages} page{fileState.totalPages !== 1 ? "s" : ""})</p>
                )}
              </div>
              <div className="flex items-center gap-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setConfig((c) => c ? { ...c, copies: Math.max(1, c.copies - 1) } : c)}
                  style={{ touchAction: "manipulation" }}
                  aria-label="Decrease copies"
                  className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors focus-visible:outline-none"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-white font-bold text-base">{config.copies}</span>
                <button
                  type="button"
                  onClick={() => setConfig((c) => c ? { ...c, copies: Math.min(99, c.copies + 1) } : c)}
                  style={{ touchAction: "manipulation" }}
                  aria-label="Increase copies"
                  className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors focus-visible:outline-none"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pages row */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Pages</p>
              <div className="flex bg-gray-100 rounded-full p-1">
                {(["All", "Custom"] as const).map((pg) => {
                  const isActive = pg === "Custom" ? config.useCustomRange : !config.useCustomRange;
                  return (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setConfig((c) => c ? { ...c, useCustomRange: pg === "Custom" } : c)}
                      style={{ touchAction: "manipulation" }}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors focus-visible:outline-none ${
                        isActive ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom range input */}
            {config.useCustomRange && (
              <input
                type="text"
                placeholder="e.g. 1-3, 5, 7-9"
                value={config.pageRange}
                onChange={(e) => setConfig((c) => c ? { ...c, pageRange: e.target.value } : c)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {/* Color choice */}
            <OptionPair
              label="Choose print color"
              value={config.color ? "color" : "bw"}
              onChange={(v) => setConfig((c) => c ? { ...c, color: v === "color" } : c)}
              disabled={caps ? !caps.color : false}
              options={[
                { value: "color", label: "Coloured", icon: "🎨" },
                { value: "bw", label: "B & W", icon: "⚫" },
              ]}
            />

            {/* Orientation */}
            <OptionPair
              label="Choose print orientation"
              value={config.orientation}
              onChange={(v) => setConfig((c) => c ? { ...c, orientation: v } : c)}
              options={[
                { value: "portrait", label: "Portrait", icon: "📄" },
                { value: "landscape", label: "Landscape", icon: "🖼️" },
              ]}
            />

            {/* Duplex (if supported) */}
            {caps?.sides && caps.sides.some(s => s.startsWith("two-sided")) && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Double-sided</p>
                <button
                  type="button"
                  onClick={() => setConfig((c) => c ? { ...c, duplex: !c.duplex } : c)}
                  style={{ touchAction: "manipulation" }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                    config.duplex ? "bg-green-500" : "bg-gray-200"
                  }`}
                  role="switch"
                  aria-checked={config.duplex}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      config.duplex ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pay Error */}
        {payError && (
          <div className="mx-4 mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{payError}</span>
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div
        className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 px-4 pt-3"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        {/* Price */}
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Estimated Cost</p>
            <p className="text-[10px] text-gray-400">*Final cost may vary based on the kiosk model</p>
          </div>
          <div className="text-right">
            {priceState === "ready" && rawPriceResult ? (
              <p className="text-xl font-bold text-blue-600">{formatPaise(rawPriceResult.pricePaise)}</p>
            ) : priceState === "fetching" ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
              <p className="text-xl font-bold text-gray-300">—</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Save to Library */}
          <button
            type="button"
            disabled={!hasFile}
            style={{ touchAction: "manipulation" }}
            className="min-h-[52px] rounded-2xl border-2 border-gray-200 text-blue-600 font-semibold text-sm hover:bg-blue-50 active:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Save to Library
          </button>

          {/* Scan Kiosk / Pay */}
          {!shopId ? (
            <button
              type="button"
              onClick={() => router.push("/app/scan")}
              style={{ touchAction: "manipulation" }}
              className="min-h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <QrCode className="w-4 h-4" />
              Scan Kiosk
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePay}
              disabled={!hasFile || priceState !== "ready" || paying}
              style={{ touchAction: "manipulation" }}
              className="min-h-[52px] rounded-2xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {paying ? "Processing…" : "Pay & Print"}
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
        className="sr-only"
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelect(f);
          e.target.value = "";
        }}
      />

      {/* Upload Progress Sheet */}
      {showUploadSheet && (
        <UploadProgressSheet
          progress={uploadProgress}
          success={uploadState === "done"}
          onClose={() => setShowUploadSheet(false)}
        />
      )}
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="min-h-full flex items-center justify-center"><Loader2 className="w-6 h-6 text-green-500 animate-spin" /></div>}>
      <PrintContent />
    </Suspense>
  );
}
