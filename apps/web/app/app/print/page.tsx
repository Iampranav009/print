"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { PrinterCapabilities, PriceBreakdown } from "@printbuddy/shared";
import { DEFAULT_CAPABILITIES } from "@printbuddy/shared";
import { PDFDocument } from "pdf-lib";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { DocumentPreview } from "@/components/DocumentPreview";
import { DocumentUploadIcon } from "@/components/DocumentUploadIcon";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import {
  KIOSK_BROADCAST_EVENT,
  kioskChannelName,
  newSessionId,
  type KioskEvent,
} from "@/lib/kiosk-events";
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

// The raw files the user picked, kept around for the preview even after
// they've been merged into a single PDF for the server.
interface RawFile {
  file: File;
  name: string;
  mime: string;
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
  totalFiles,
}: {
  progress: number;
  success: boolean;
  onClose: () => void;
  totalFiles: number;
}) {
  // Files "processed" is derived from progress. When it hits 100% every
  // file the user picked has been sent (they're merged client-side into
  // one PDF before upload, so upload progress applies to the whole batch).
  const filesDone = progress >= 100 ? totalFiles : 0;
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
            {/* Shared upload icon so mobile + kiosk render identically */}
            <div className="mb-4">
              <DocumentUploadIcon size="sm" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Uploading {totalFiles === 1 ? "Document" : "Documents"}
            </h3>
            <p className="text-xs text-gray-500 mt-1 tabular-nums">
              {filesDone}/{totalFiles} file{totalFiles !== 1 ? "s" : ""}
            </p>

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

// ── Chip Strip — horizontal row of selectable chips ─────────────────────────

function ChipStrip<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
  format,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  format?: (v: T) => string;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-900 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt === value;
          const label = format ? format(opt) : String(opt);
          return (
            <button
              key={String(opt)}
              type="button"
              onClick={() => !disabled && onChange(opt)}
              disabled={disabled}
              style={{ touchAction: "manipulation" }}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active
                  ? "border-blue-700 bg-blue-50 text-blue-800"
                  : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
              } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Toggle Row ────────────────────────────────────────────────────────────────

function ToggleOption({
  label,
  subtitle,
  value,
  onChange,
  disabled,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-bold text-gray-900">{label}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        style={{ touchAction: "manipulation" }}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
          value ? "bg-green-500" : "bg-gray-200"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
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
  const [rawFiles, setRawFiles] = useState<RawFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  const [config, setConfig] = useState<Config | null>(null);
  const [priceState, setPriceState] = useState<"idle" | "fetching" | "ready" | "error">("idle");
  const [rawPriceResult, setRawPriceResult] = useState<PriceResult | null>(null);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Live broadcast channel to the matching kiosk screen. One session per
  // page load; regenerated when the user picks a fresh file so old kiosk
  // state doesn't linger.
  const sessionIdRef = useRef<string>(newSessionId());
  const broadcastChannelRef = useRef<RealtimeChannel | null>(null);
  const lastProgressBroadcastRef = useRef<number>(0);

  useEffect(() => {
    if (!shopId) return;
    const supabase = createBrowserSupabase();
    const channel = supabase.channel(kioskChannelName(shopId), {
      config: { broadcast: { self: false } },
    });
    channel.subscribe();
    broadcastChannelRef.current = channel;
    return () => {
      channel.unsubscribe();
      broadcastChannelRef.current = null;
    };
  }, [shopId]);

  const broadcast = useCallback((event: KioskEvent) => {
    const channel = broadcastChannelRef.current;
    if (!channel) return;
    channel
      .send({ type: "broadcast", event: KIOSK_BROADCAST_EVENT, payload: event })
      .catch(() => {
        // silent — the kiosk display is a best-effort mirror
      });
  }, []);

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

  // Merge PDFs + images into one PDF using pdf-lib. Runs entirely in the
  // browser so the server keeps its single-file contract. Images become
  // full-page pages sized to the image's own dimensions.
  const mergeFilesIntoPdf = useCallback(async (files: File[]): Promise<File> => {
    const out = await PDFDocument.create();

    for (const f of files) {
      const buf = await f.arrayBuffer();
      if (f.type === "application/pdf") {
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      } else if (f.type === "image/jpeg" || f.type === "image/jpg") {
        const img = await out.embedJpg(new Uint8Array(buf));
        const page = out.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      } else if (f.type === "image/png") {
        const img = await out.embedPng(new Uint8Array(buf));
        const page = out.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
    }

    const bytes = await out.save();
    const suggestedName =
      files.length === 1
        ? files[0].name.replace(/\.[^.]+$/, ".pdf")
        : `documents-${files.length}-files.pdf`;
    // File constructor requires a BlobPart array — copy into a plain Uint8Array
    // so TypeScript is happy across pdf-lib's Uint8Array<ArrayBufferLike> type.
    const buf = new Uint8Array(bytes.length);
    buf.set(bytes);
    return new File([buf], suggestedName, { type: "application/pdf" });
  }, []);

  const handleFilesSelect = useCallback(async (rawInputs: File[]) => {
    if (rawInputs.length === 0) return;

    const ACCEPTED = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ]);
    const rejected = rawInputs.filter((f) => !ACCEPTED.has(f.type));
    if (rejected.length > 0) {
      setUploadError(`Unsupported file type: ${rejected.map((r) => r.name).join(", ")}`);
      return;
    }
    const totalSize = rawInputs.reduce((s, f) => s + f.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      setUploadError("Total size too large (max 50 MB across all files)");
      return;
    }

    setUploadError(null);
    setRawFiles(
      rawInputs.map((f) => ({ file: f, name: f.name, mime: f.type }))
    );
    setUploadState("uploading");
    setUploadProgress(0);
    setShowUploadSheet(true);

    // New upload = new customer session on the kiosk view.
    sessionIdRef.current = newSessionId();
    lastProgressBroadcastRef.current = 0;
    broadcast({
      type: "upload:start",
      sessionId: sessionIdRef.current,
      fileName: rawInputs[0].name,
      fileCount: rawInputs.length,
      sentAt: new Date().toISOString(),
    });

    try {
      // If more than one file OR the single file is an image, produce a
      // merged PDF so the server sees a single, printable document.
      const needsMerge =
        rawInputs.length > 1 ||
        (rawInputs[0].type !== "application/pdf");

      const uploadableFile = needsMerge
        ? await mergeFilesIntoPdf(rawInputs)
        : rawInputs[0];

      // Get signed upload URL for the (possibly merged) file
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: uploadableFile.name,
          fileSize: uploadableFile.size,
          mimeType: uploadableFile.type,
        }),
      });
      if (!res.ok) throw new Error("Could not get upload URL");
      const { signedUrl, path, mime } = (await res.json()) as {
        signedUrl: string;
        path: string;
        mime: string;
      };

      await uploadToSignedUrl(signedUrl, uploadableFile, (pct) => {
        setUploadProgress(pct);
        // Throttle broadcasts — only every 5% (and always at 100%) so we
        // don't spam the kiosk with hundreds of tiny updates.
        if (pct - lastProgressBroadcastRef.current >= 5 || pct === 100) {
          lastProgressBroadcastRef.current = pct;
          broadcast({
            type: "upload:progress",
            sessionId: sessionIdRef.current,
            percent: pct,
            sentAt: new Date().toISOString(),
          });
        }
      });

      // Get page count
      const countRes = await fetch("/api/uploads/page-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!countRes.ok) throw new Error("Could not count pages");
      const { pageCount } = (await countRes.json()) as { pageCount: number };

      setFileState({ file: uploadableFile, path, mime, totalPages: pageCount });
      setUploadState("done");
      setUploadProgress(100);

      broadcast({
        type: "upload:done",
        sessionId: sessionIdRef.current,
        fileName: uploadableFile.name,
        pageCount,
        sentAt: new Date().toISOString(),
      });

      setTimeout(() => setShowUploadSheet(false), 1500);
    } catch (err: unknown) {
      setUploadState("error");
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setShowUploadSheet(false);
    }
  }, [mergeFilesIntoPdf]);

  const handleFileSelect = useCallback(
    (file: File) => handleFilesSelect([file]),
    [handleFilesSelect]
  );

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
            quality: config.quality,
            media_type: config.mediaType,
            reverse: config.reverse,
            scaling: config.scaling,
            finishings: config.finishings,
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
        modal: {
          ondismiss: () => {
            broadcast({
              type: "checkout:dismissed",
              sessionId: sessionIdRef.current,
              sentAt: new Date().toISOString(),
            });
          },
        },
        handler: () => {
          router.push(`/app/history/${jobId}`);
        },
      });

      broadcast({
        type: "checkout:opened",
        sessionId: sessionIdRef.current,
        amountPaise: amount,
        fileName: fileState.file.name,
        sentAt: new Date().toISOString(),
      });

      rzp.open();
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }, [fileState, config, rawPriceResult, shopId, shopData, router, broadcast]);

  const caps = shopData?.capabilities ?? DEFAULT_CAPABILITIES;
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
                <p className="text-xs text-gray-500 mt-1">Pick one or more · PDF, JPG, PNG · up to 50 MB total</p>
              </div>
            </button>
          ) : (
            /* Document Preview with page-by-page swipe */
            <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm p-3">
              {/* Dismiss */}
              <button
                type="button"
                onClick={() => {
                  setFileState(null);
                  setRawFiles([]);
                  setUploadState("idle");
                  setRawPriceResult(null);
                  setPriceState("idle");
                }}
                style={{ touchAction: "manipulation" }}
                className="absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                aria-label="Remove file"
              >
                <X className="w-3.5 h-3.5 text-gray-600" />
              </button>

              <DocumentPreview
                files={rawFiles.length > 0 ? rawFiles : [{ file: fileState.file, name: fileState.file.name, mime: fileState.mime }]}
                orientation={config?.orientation ?? "portrait"}
                grayscale={config ? !config.color : false}
              />

              {rawFiles.length > 1 && (
                <p className="text-[11px] text-gray-500 mt-2 text-center">
                  {rawFiles.length} files combined into one print job
                </p>
              )}
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
              <ToggleOption
                label="Double-sided"
                value={config.duplex}
                onChange={(v) => setConfig((c) => c ? { ...c, duplex: v } : c)}
              />
            )}

            {/* Paper size */}
            {caps?.media && caps.media.length > 1 && (
              <ChipStrip
                label="Paper size"
                options={caps.media as string[]}
                value={config.paper}
                onChange={(v) => setConfig((c) => c ? { ...c, paper: v } : c)}
              />
            )}

            {/* Pages per sheet */}
            {caps?.number_up && caps.number_up.some(n => n > 1) && (
              <ChipStrip
                label="Pages per sheet"
                options={caps.number_up}
                value={config.numberUp}
                onChange={(v) => setConfig((c) => c ? { ...c, numberUp: v } : c)}
                format={(v) => v === 1 ? "1 page" : `${v} pages`}
              />
            )}

            {/* Print quality */}
            {caps?.quality && caps.quality.length > 1 && (
              <ChipStrip
                label="Print quality"
                options={caps.quality as string[]}
                value={config.quality}
                onChange={(v) => setConfig((c) => c ? { ...c, quality: v as Config["quality"] } : c)}
                format={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
              />
            )}

            {/* Scaling */}
            {caps?.scaling && caps.scaling.length > 1 && (
              <ChipStrip
                label="Page scaling"
                options={caps.scaling as string[]}
                value={config.scaling}
                onChange={(v) => setConfig((c) => c ? { ...c, scaling: v as Config["scaling"] } : c)}
                format={(v) => {
                  if (v === "none") return "None";
                  if (v === "fit-to-page") return "Fit to page";
                  if (v === "shrink-to-fit") return "Shrink to fit";
                  return v;
                }}
              />
            )}

            {/* Media type */}
            {caps?.media_types && caps.media_types.length > 1 && (
              <ChipStrip
                label="Media type"
                options={caps.media_types}
                value={config.mediaType}
                onChange={(v) => setConfig((c) => c ? { ...c, mediaType: v } : c)}
                format={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
              />
            )}

            {/* Collate — only relevant when printing multiple copies */}
            {config.copies > 1 && caps?.collate && (
              <ToggleOption
                label="Collate copies"
                subtitle="Print pages in order per copy"
                value={config.collate}
                onChange={(v) => setConfig((c) => c ? { ...c, collate: v } : c)}
              />
            )}

            {/* Reverse order */}
            {caps?.reverse && (
              <ToggleOption
                label="Reverse page order"
                subtitle="Print last page first"
                value={config.reverse}
                onChange={(v) => setConfig((c) => c ? { ...c, reverse: v } : c)}
              />
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
        className="fixed inset-x-0 bottom-0 z-30 bg-white border-t border-gray-100 px-4 pt-3"
        style={{
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
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

        <div>
          {/* Scan Kiosk / Pay — single full-width button */}
          {!shopId ? (
            <button
              type="button"
              onClick={() => router.push("/app/scan")}
              style={{ touchAction: "manipulation" }}
              className="w-full min-h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm"
            >
              <QrCode className="w-5 h-5" />
              Scan Kiosk
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePay}
              disabled={!hasFile || priceState !== "ready" || paying}
              style={{ touchAction: "manipulation" }}
              className="w-full min-h-[52px] rounded-2xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 shadow-sm"
            >
              {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {paying ? "Processing…" : "Pay & Print"}
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input — multiple files are merged into one PDF client-side */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="sr-only"
        aria-hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) void handleFilesSelect(files);
          e.target.value = "";
        }}
      />

      {/* Upload Progress Sheet */}
      {showUploadSheet && (
        <UploadProgressSheet
          totalFiles={Math.max(1, rawFiles.length)}
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
