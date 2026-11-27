"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback, useId } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { PrinterCapabilities, PriceBreakdown, PrintOptions } from "@printbuddy/shared";
import { DEFAULT_CAPABILITIES } from "@printbuddy/shared";
import { PDFDocument } from "pdf-lib";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Brand } from "@/components/Brand";
import { DocumentPreview } from "@/components/DocumentPreview";
import { DocumentUploadIcon } from "@/components/DocumentUploadIcon";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import {
  KIOSK_BROADCAST_EVENT,
  kioskChannelName,
  newSessionId,
  type KioskEvent,
} from "@/lib/kiosk-events";
import { clearPendingShare, getPendingShare } from "@/lib/pending-share";
import { dominantOrientation, imageToJpeg, isImageFile, isPdfFile } from "@/lib/print-files";
import { NavBar } from "@/components/mobile/NavBar";
import { Sheet } from "@/components/mobile/Sheet";
import { Segmented } from "@/components/mobile/Segmented";
import { Pill } from "@/components/Pill";
import { Toggle } from "@/components/Toggle";
import {
  Plus,
  Minus,
  FileText,
  X,
  Upload,
  Loader2,
  AlertCircle,
  Check,
  QrCode,
  Banknote,
  CreditCard,
  Contrast,
  Info,
  Palette,
  RectangleVertical,
  RectangleHorizontal,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShopData {
  shop: { id: string; name: string; location: string | null; virtual_mode?: boolean; cash_payments_enabled?: boolean; default_payment_method?: "online" | "cash"; online_payments_enabled?: boolean };
  capabilities: PrinterCapabilities | null;
  printer_features?: { color_enabled: boolean; duplex_enabled: boolean };
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

type CashfreeCheckoutResult = { error?: { message?: string }; paymentDetails?: unknown; redirect?: boolean };
type CashfreeWindow = Window & {
  Cashfree: (opts: { mode: "sandbox" | "production" }) => {
    checkout(opts: { paymentSessionId: string; redirectTarget: "_modal" | "_self" }): Promise<CashfreeCheckoutResult>;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2)}`;
}

function defaultConfig(caps: PrinterCapabilities | null): Config {
  return {
    copies: 1,
    color: false,
    orientation: "portrait",
    paper: "A4",
    duplex: false,
    duplex_edge: "long",
    useCustomRange: false,
    pageRange: "",
    numberUp: 1,
    collate: true,
    quality: "normal",
    mediaType: "plain",
    reverse: false,
    scaling: "none",
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
    <Sheet open onClose={onClose}>
      {success ? (
        <div className="flex flex-col items-center text-center pt-4 pb-2">
          <div className="w-20 h-20 rounded-full bg-tint flex items-center justify-center mb-4 shadow-[0_10px_30px_rgba(12,131,31,0.35)]">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h3 className="text-[20px] font-bold tracking-[-0.02em] text-label">Document uploaded</h3>
          <p className="text-[13px] text-secondary-label mt-1.5">We delete your uploaded files once the job is done</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center pt-2">
          {/* Shared upload icon so mobile + kiosk render identically */}
          <div className="mb-4">
            <DocumentUploadIcon size="sm" />
          </div>
          <h3 className="text-[20px] font-bold tracking-[-0.02em] text-label">
            Uploading {totalFiles === 1 ? "document" : "documents"}
          </h3>
          <p className="text-[13px] text-secondary-label mt-1 tabular-nums">
            {filesDone}/{totalFiles} file{totalFiles !== 1 ? "s" : ""}
          </p>

          {/* Progress bar */}
          <div className="w-full mt-5 mb-2">
            <div className="h-1.5 bg-zinc-500/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-tint rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="text-[13px] font-semibold text-label self-end tabular-nums">{progress}%</p>

          <p className="text-[13px] text-tint mt-3 font-medium">
            We delete your uploaded files once delivered
          </p>

          <button
            type="button"
            onClick={onClose}
            style={{ touchAction: "manipulation" }}
            className="mt-4 min-h-11 px-5 rounded-full text-[15px] font-semibold text-tint active:bg-black/[0.04]"
          >
            Cancel uploading
          </button>
        </div>
      )}
    </Sheet>
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
  options: Array<{
    value: T;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
    unavailable?: boolean;
    disabledReason?: string;
  }>;
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-[15px] font-semibold text-label mb-2">{label}</p>
      <Segmented
        ariaLabel={label}
        value={value}
        onChange={onChange}
        options={options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          icon: opt.icon,
          disabled: disabled || !!opt.disabled,
          unavailable: opt.unavailable,
          title: opt.disabledReason,
        }))}
      />
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
      <p className="text-[15px] font-semibold text-label mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Pill
            key={String(opt)}
            active={opt === value}
            onClick={() => !disabled && onChange(opt)}
            disabled={disabled}
          >
            {format ? format(opt) : String(opt)}
          </Pill>
        ))}
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
  unavailable,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  unavailable?: boolean;
}) {
  const id = useId();
  return (
    <div className={`flex items-center justify-between gap-4${unavailable ? " pointer-events-none opacity-40 blur-[0.4px]" : ""}`}>
      <div id={id}>
        <p className="text-[15px] font-semibold text-label">{label}</p>
        {subtitle && <p className="text-[13px] text-secondary-label mt-0.5">{subtitle}</p>}
      </div>
      <Toggle
        checked={value}
        onChange={() => !disabled && !unavailable && onChange(!value)}
        disabled={disabled}
        aria-labelledby={id}
      />
    </div>
  );
}

// ── Print Content ─────────────────────────────────────────────────────────────

function useIsDesktop() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return desktop;
}

function DesktopGate() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Same header as login page */}
      <header className="hm-auth-header">
        <Brand />
        <Link href="/support" className="text-xs font-medium">Need a hand? ↗</Link>
      </header>

      {/* Backdrop + centered popup */}
      <div className="flex-1 flex items-center justify-center bg-gray-50/60 px-4 py-10">
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 px-8 py-10 text-center">
          {/* Close → homepage */}
          <a
            href="/"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </a>

          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-1">Switch to your phone</h1>
          <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
            Scan this QR code to open HIMMER on your mobile browser.
          </p>

          {/* QR code */}
          {url && (
            <div className="mt-6 inline-block p-4 rounded-2xl border border-gray-100 bg-gray-50">
              <QRCodeSVG value={url} size={160} level="M" />
            </div>
          )}

          {/* Steps */}
          <ol className="mt-6 text-left max-w-xs mx-auto space-y-2.5">
            {[
              "Open your phone camera and scan the QR code",
              "Tap the link to open HIMMER",
              "Upload your document, pay, and collect your print",
            ].map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-600">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 font-bold text-[11px] flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="pt-px">{step}</span>
              </li>
            ))}
          </ol>

          {/* Close button */}
          <a
            href="/"
            className="mt-8 inline-flex min-h-[44px] w-full max-w-xs items-center justify-center rounded-2xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-colors"
          >
            Go to homepage
          </a>

          <p className="mt-4 text-[11px] text-gray-400">
            You can browse and sign up on desktop — printing requires a mobile device.
          </p>
        </div>
      </div>
    </div>
  );
}

function PrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const shopId = searchParams.get("shop");
  const isSharedEntry = searchParams.get("shared") === "1";
  const sharedEntryError = searchParams.get("shared_error") === "1";

  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);

  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileState, setFileState] = useState<FileState | null>(null);
  const [rawFiles, setRawFiles] = useState<RawFile[]>([]);
  const rawFilesRef = useRef<RawFile[]>([]);
  useEffect(() => { rawFilesRef.current = rawFiles; }, [rawFiles]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [pendingSharedFiles, setPendingSharedFiles] = useState<File[]>([]);
  const [sharedImportError, setSharedImportError] = useState<string | null>(null);
  const sharedImportStartedRef = useRef(false);

  const [config, setConfig] = useState<Config | null>(null);
  const [priceState, setPriceState] = useState<"idle" | "fetching" | "ready" | "error">("idle");
  const [rawPriceResult, setRawPriceResult] = useState<PriceResult | null>(null);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");

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
        const onlineOn = data.shop.online_payments_enabled !== false;
        const cashOn = data.shop.cash_payments_enabled ?? false;
        setPaymentMethod(!onlineOn && cashOn ? "cash" : "online");
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

  const priceRequest = useRef(0);
  // Fetch price
  const fetchPrice = useCallback(async () => {
    if (!fileState || !config) return;
    const request = ++priceRequest.current;
    setPriceState("fetching");
    setRawPriceResult(null);
    try {
      const body = {
        shopId: shopId ?? "virtual",
        pageCount: fileState.totalPages,
        pageRange: config.useCustomRange ? config.pageRange : null,
        numberUp: config.numberUp,
        mediaType: config.mediaType,
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
      if (request !== priceRequest.current) return;
      setRawPriceResult(result);
      setPriceState("ready");
    } catch {
      if (request !== priceRequest.current) return;
      setPriceState("error");
    }
  }, [fileState, config, shopId]);

  useEffect(() => {
    if (fileState && config) fetchPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileState?.path, config?.copies, config?.color, config?.orientation, config?.paper, config?.duplex, config?.useCustomRange, config?.pageRange, config?.numberUp, config?.mediaType]);

  // Merge PDFs + images into one PDF using pdf-lib. Runs entirely in the
  // browser so the server keeps its single-file contract. Images (any type the
  // phone can open, including HEIC) become upright JPEG pages sized to the photo.
  const mergeFilesIntoPdf = useCallback(async (files: File[]): Promise<File> => {
    const out = await PDFDocument.create();

    for (const f of files) {
      if (isPdfFile(f)) {
        const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      } else {
        const photo = await imageToJpeg(f);
        const img = await out.embedJpg(photo.bytes);
        const page = out.addPage([photo.width, photo.height]);
        page.drawImage(img, { x: 0, y: 0, width: photo.width, height: photo.height });
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

  // append=true: add new files to the existing set and re-merge/re-upload.
  const handleFilesSelect = useCallback(async (rawInputs: File[], append = false) => {
    if (rawInputs.length === 0) return;

    const rejected = rawInputs.filter((f) => !isPdfFile(f) && !isImageFile(f));
    if (rejected.length > 0) {
      setUploadError(`Can't print ${rejected.map((r) => r.name).join(", ")} yet. Use a PDF or a photo (Word and PowerPoint: save as PDF first).`);
      return;
    }

    // Combine with existing files when appending
    const existingFiles = append ? rawFilesRef.current.map((r) => r.file) : [];
    const allFiles = [...existingFiles, ...rawInputs];

    const totalSize = allFiles.reduce((s, f) => s + f.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      setUploadError("Total size too large (max 50 MB across all files)");
      return;
    }

    setUploadError(null);
    setRawFiles(allFiles.map((f) => ({ file: f, name: f.name, mime: f.type })));
    setUploadState("uploading");
    setUploadProgress(0);
    setShowUploadSheet(true);

    sessionIdRef.current = newSessionId();
    lastProgressBroadcastRef.current = 0;
    broadcast({
      type: "upload:start",
      sessionId: sessionIdRef.current,
      fileName: allFiles[0].name,
      fileCount: allFiles.length,
      sentAt: new Date().toISOString(),
    });

    try {
      // Always merge when there are multiple files or any image
      const needsMerge = allFiles.length > 1 || !isPdfFile(allFiles[0]);

      const uploadableFile = needsMerge
        ? await mergeFilesIntoPdf(allFiles)
        : allFiles[0];

      // Start in the layout the document mostly uses; the customer can still change it.
      const detected = dominantOrientation(
        await PDFDocument.load(await uploadableFile.arrayBuffer(), { ignoreEncryption: true })
      );
      setConfig((c) => (c ? { ...c, orientation: detected } : c));

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
  }, [broadcast, mergeFilesIntoPdf]);

  // Files received from Android/Chrome's system share sheet are placed in
  // IndexedDB by the service worker. Keep them local until a shop is scanned;
  // only then do they enter the existing signed-upload and pricing flow.
  useEffect(() => {
    if (!isSharedEntry || sharedImportStartedRef.current) return;
    sharedImportStartedRef.current = true;

    let active = true;
    void getPendingShare()
      .then((pending) => {
        if (!active) return;
        if (!pending || pending.files.length === 0) {
          setSharedImportError("The shared file is no longer available. Please share it again.");
          return;
        }

        // Shared documents are intentionally short-lived on the device.
        if (Date.now() - pending.receivedAt > 10 * 60 * 1000) {
          void clearPendingShare();
          setSharedImportError("The shared file expired for privacy. Please share it again.");
          return;
        }

        setPendingSharedFiles(pending.files);
        setRawFiles(
          pending.files.map((file) => ({ file, name: file.name, mime: file.type }))
        );

        if (shopId) {
          void handleFilesSelect(pending.files);
        }
      })
      .catch(() => {
        if (active) setSharedImportError("HIMMER could not read the shared file.");
      });

    return () => {
      active = false;
    };
  }, [handleFilesSelect, isSharedEntry, shopId]);

  useEffect(() => {
    if (isSharedEntry && uploadState === "done") {
      void clearPendingShare();
    }
  }, [isSharedEntry, uploadState]);

  // Cashfree pay
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
          paymentMethod,
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
      if (!res.ok) { const failure = await res.json(); throw new Error(failure.error ?? "Could not create print job"); }
      const { jobId, paymentSessionId, cashfreeMode, amount } = await res.json() as {
        jobId: string;
        paymentSessionId?: string;
        cashfreeMode?: "sandbox" | "production";
        amount: number;
      };

      if (paymentMethod === "cash") {
        router.push(`/app/history/${jobId}`);
        return;
      }

      const win = window as unknown as CashfreeWindow;
      if (typeof win.Cashfree !== "function" || !paymentSessionId) throw new Error("Payment not available");
      const cashfree = win.Cashfree({ mode: cashfreeMode ?? "sandbox" });

      broadcast({
        type: "checkout:opened",
        sessionId: sessionIdRef.current,
        amountPaise: amount,
        fileName: fileState.file.name,
        sentAt: new Date().toISOString(),
      });

      // Dispatch is driven only by the signed webhook; this result just routes the UI.
      void cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" }).then((result) => {
        if (result.paymentDetails || result.redirect) {
          router.push(`/app/history/${jobId}`);
        } else {
          broadcast({
            type: "checkout:dismissed",
            sessionId: sessionIdRef.current,
            sentAt: new Date().toISOString(),
          });
        }
      });
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }, [fileState, config, rawPriceResult, shopId, shopData, router, broadcast, paymentMethod]);

  const caps = shopData?.capabilities ?? DEFAULT_CAPABILITIES;
  const hasFile = fileState !== null;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isDesktop === null) {
    return <div className="min-h-full flex items-center justify-center"><Loader2 className="w-6 h-6 text-tint animate-spin" /></div>;
  }
  if (isDesktop) {
    return <DesktopGate />;
  }

  const errorBanner = "mx-4 mt-3 flex items-start gap-2 rounded-[18px] bg-red-500/10 p-3.5 text-[13px] text-red-700";

  return (
    <div className="min-h-full flex flex-col">
      <NavBar
        title={shopData?.shop.name ?? "Print"}
        back={() => router.back()}
        right={
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ touchAction: "manipulation" }}
            className="-mr-1 flex min-h-9 items-center gap-1 rounded-full bg-tint/10 px-3 text-[15px] font-semibold text-tint transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Add
          </button>
        }
      />

      {/* Shop Error */}
      {shopError && (
        <div className={errorBanner}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{shopError}</span>
        </div>
      )}

      {(sharedEntryError || sharedImportError) && (
        <div className={errorBanner}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{sharedImportError ?? "The shared file could not be received. Please open it and choose Share with HIMMER again."}</span>
        </div>
      )}

      {/* Scrollable body */}
      <div className={`flex-1 overflow-y-auto ${(shopData?.shop.online_payments_enabled !== false) && shopData?.shop.cash_payments_enabled ? "pb-64" : "pb-48"}`}>
        {/* Upload zone / File preview */}
        <div className="px-4 pt-4">
          {!shopId && pendingSharedFiles.length > 0 ? (
            <div className="glass-card w-full rounded-[28px] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-tint/10 text-tint">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-label">
                    {pendingSharedFiles.length === 1 ? "Document ready" : `${pendingSharedFiles.length} documents ready`}
                  </p>
                  <p className="mt-1 truncate text-[13px] text-secondary-label">
                    {pendingSharedFiles.map((file) => file.name).join(", ")}
                  </p>
                  <p className="mt-2 text-[13px] font-medium text-tint">
                    Scan a HIMMER kiosk to upload, price and print securely.
                  </p>
                </div>
              </div>
            </div>
          ) : !shopId ? (
            /* Locked — must scan QR first */
            <div className="w-full flex flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-tint/20 bg-white/55 p-10 text-center">
              <div className="w-14 h-14 rounded-[18px] bg-tint/10 flex items-center justify-center">
                <QrCode className="w-7 h-7 text-tint" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-label">Scan a kiosk QR code first</p>
                <p className="text-[13px] text-secondary-label mt-1">The QR code sets the print pricing before you upload</p>
              </div>
            </div>
          ) : !hasFile ? (
            /* Upload Drop Zone */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ touchAction: "manipulation" }}
              className="w-full flex flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-tint/25 bg-white/60 p-10 transition-transform duration-200 ease-spring active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint"
            >
              <div className="w-14 h-14 rounded-[18px] bg-tint flex items-center justify-center shadow-[0_8px_20px_rgba(12,131,31,0.30)]">
                <Upload className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="text-[17px] font-semibold text-label">Upload document</p>
                <p className="text-[13px] text-secondary-label mt-1">PDF or photos (JPG, PNG, WebP, HEIC…) · up to 50 MB total</p>
              </div>
            </button>
          ) : (
            /* Document Preview with page-by-page swipe */
            <div className="glass-card relative rounded-[28px] overflow-hidden p-3">
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
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center active:scale-95"
                aria-label="Remove file"
              >
                <X className="w-4 h-4 text-white" strokeWidth={2.5} />
              </button>

              <DocumentPreview
                pdf={fileState.file}
                label={rawFiles.length > 1 ? `${rawFiles.length} files` : rawFiles[0]?.name ?? fileState.file.name}
                options={{
                  copies: config?.copies ?? 1,
                  color: config?.color ?? false,
                  orientation: config?.orientation ?? "portrait",
                  paper: config?.paper ?? "A4",
                  duplex: config?.duplex ?? false,
                  duplex_edge: config?.duplex_edge ?? "long",
                  pageRange: config?.useCustomRange && config.pageRange.trim() ? config.pageRange : null,
                  numberUp: config?.numberUp ?? 1,
                  collate: config?.collate ?? true,
                  quality: (config?.quality ?? "normal") as PrintOptions["quality"],
                  mediaType: config?.mediaType ?? "plain",
                  reverse: config?.reverse ?? false,
                  scaling: (config?.scaling ?? "none") as PrintOptions["scaling"],
                  finishings: config?.finishings ?? [],
                }}
              />

              {rawFiles.length > 1 && (
                <p className="text-[12px] text-secondary-label mt-2 text-center">
                  {rawFiles.length} files combined into one print job
                </p>
              )}
            </div>
          )}

          {!hasFile && pendingSharedFiles.length === 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-[14px] bg-tint/[0.07] px-3.5 py-2.5 text-[13px] leading-snug text-secondary-label">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-tint" aria-hidden />
              <span>You can print PDFs and photos (JPG, PNG, WebP, HEIC). For Word or PowerPoint files, save them as PDF first.</span>
            </p>
          )}

          {uploadError && (
            <div className="mt-2 flex items-center gap-2 px-1 text-[13px] text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Print Options */}
        {config && (
          <>
          <section className="glass-card mx-4 mt-4 rounded-[28px] p-4 space-y-4">
            {/* Copies row */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-semibold text-label">Copies</p>
                {fileState && (
                  <p className="text-[13px] text-secondary-label mt-0.5">File 1 · {fileState.totalPages} page{fileState.totalPages !== 1 ? "s" : ""}</p>
                )}
              </div>
              <div className="flex items-center rounded-full bg-zinc-500/[0.12] p-[3px]">
                <button
                  type="button"
                  onClick={() => setConfig((c) => c ? { ...c, copies: Math.max(1, c.copies - 1) } : c)}
                  style={{ touchAction: "manipulation" }}
                  aria-label="Decrease copies"
                  className="w-10 h-9 rounded-full flex items-center justify-center text-tint active:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint"
                >
                  <Minus className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <span className="w-9 text-center text-[17px] font-bold tabular-nums text-label" aria-live="polite">{config.copies}</span>
                <button
                  type="button"
                  onClick={() => setConfig((c) => c ? { ...c, copies: Math.min(99, c.copies + 1) } : c)}
                  style={{ touchAction: "manipulation" }}
                  aria-label="Increase copies"
                  className="w-10 h-9 rounded-full flex items-center justify-center text-tint active:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="h-px bg-black/[0.06]" />

            {/* Pages row */}
            <div className="flex items-center justify-between gap-4">
              <p className="text-[15px] font-semibold text-label">Pages</p>
              <div className="w-44">
                <Segmented
                  size="sm"
                  ariaLabel="Pages"
                  value={config.useCustomRange ? "custom" : "all"}
                  onChange={(v) => setConfig((c) => c ? { ...c, useCustomRange: v === "custom" } : c)}
                  options={[
                    { value: "all", label: "All" },
                    { value: "custom", label: "Custom" },
                  ]}
                />
              </div>
            </div>

            {/* Custom range input */}
            {config.useCustomRange && (
              <input
                type="text"
                placeholder="e.g. 1-3, 5, 7-9"
                value={config.pageRange}
                onChange={(e) => setConfig((c) => c ? { ...c, pageRange: e.target.value } : c)}
                className="w-full min-h-11 rounded-[14px] border border-black/[0.06] bg-white/90 px-4 text-[16px] text-label placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-tint"
              />
            )}
          </section>

          <section className="glass-card mx-4 mt-3 rounded-[28px] p-4 space-y-5">
            {/* Color choice */}
            <OptionPair
              label="Colour"
              value={config.color ? "color" : "bw"}
              onChange={(v) => setConfig((c) => c ? { ...c, color: v === "color" } : c)}
              options={[
                { value: "bw", label: "B & W", icon: <Contrast className="w-4 h-4" /> },
                {
                  value: "color",
                  label: "Colour",
                  icon: <Palette className="w-4 h-4" />,
                  unavailable: shopData?.printer_features?.color_enabled === false,
                  disabledReason: shopData?.printer_features?.color_enabled === false ? "Not available at this shop" : undefined,
                },
              ]}
            />

            {/* Orientation */}
            <OptionPair
              label="Orientation"
              value={config.orientation}
              onChange={(v) => setConfig((c) => c ? { ...c, orientation: v } : c)}
              options={[
                { value: "portrait", label: "Portrait", icon: <RectangleVertical className="w-4 h-4" /> },
                { value: "landscape", label: "Landscape", icon: <RectangleHorizontal className="w-4 h-4" /> },
              ]}
            />

            {/* Duplex (if hardware supports it; blurred when vendor disabled) */}
            {caps?.sides && caps.sides.some(s => s.startsWith("two-sided")) && (
              <ToggleOption
                label="Double-sided"
                subtitle={
                  shopData?.printer_features?.duplex_enabled === false
                    ? "Not available at this shop"
                    : fileState && fileState.totalPages <= 1
                    ? "Need at least 2 pages"
                    : undefined
                }
                value={config.duplex}
                onChange={(v) => setConfig((c) => c ? { ...c, duplex: v } : c)}
                disabled={fileState !== null && fileState.totalPages <= 1}
                unavailable={shopData?.printer_features?.duplex_enabled === false}
              />
            )}

            {/* Pages per sheet — disabled for single-page documents */}
            {caps?.number_up && caps.number_up.some(n => n > 1) && (
              <ChipStrip
                label="Pages per sheet"
                options={caps.number_up}
                value={config.numberUp}
                onChange={(v) => setConfig((c) => c ? { ...c, numberUp: v } : c)}
                format={(v) => v === 1 ? "1 page" : `${v} pages`}
                disabled={fileState !== null && fileState.totalPages <= 1}
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

            {/* Collate — only relevant when printing multiple copies */}
            {config.copies > 1 && caps?.collate && (
              <ToggleOption
                label="Collate copies"
                subtitle="Print pages in order per copy"
                value={config.collate}
                onChange={(v) => setConfig((c) => c ? { ...c, collate: v } : c)}
              />
            )}
          </section>
          </>
        )}

        {/* Pay Error */}
        {payError && (
          <div className={errorBanner}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{payError}</span>
          </div>
        )}
      </div>

      {/* Floating Pay Bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 px-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="glass-sheet mx-auto max-w-2xl rounded-[28px] p-4">
        {shopId && (shopData?.shop.online_payments_enabled !== false) && shopData?.shop.cash_payments_enabled && (
          <div className="mb-3">
            <Segmented
              ariaLabel="Payment method"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={[
                { value: "online", label: "Online", icon: <CreditCard className="w-4 h-4" /> },
                { value: "cash", label: "Cash at counter", icon: <Banknote className="w-4 h-4" /> },
              ]}
            />
          </div>
        )}
        {/* Price */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <p className="text-[15px] font-semibold text-label">Total</p>
            <p className="text-[12px] text-secondary-label">Price is confirmed before payment</p>
          </div>
          <div className="text-right" aria-live="polite">
            {priceState === "ready" && rawPriceResult ? (
              <p className="text-[26px] font-bold tracking-[-0.03em] tabular-nums text-label">{formatPaise(rawPriceResult.pricePaise)}</p>
            ) : priceState === "fetching" ? (
              <Loader2 className="w-5 h-5 text-tint animate-spin" />
            ) : (
              <p className="text-[26px] font-bold text-zinc-300">—</p>
            )}
          </div>
        </div>

        <div>
          {/* Scan Kiosk / Pay — single full-width button */}
          {!shopId ? (
            <button
              type="button"
              onClick={() => router.push(isSharedEntry ? "/app/scan?shared=1" : "/app/scan")}
              style={{ touchAction: "manipulation" }}
              className="w-full min-h-[52px] rounded-full bg-tint text-white font-semibold text-[16px] flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(12,131,31,0.30)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint focus-visible:ring-offset-2"
            >
              <QrCode className="w-5 h-5" />
              {isSharedEntry ? "Scan Now" : "Scan Kiosk"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePay}
              disabled={!hasFile || priceState !== "ready" || paying}
              style={{ touchAction: "manipulation" }}
              className="w-full min-h-[52px] rounded-full bg-tint text-white font-semibold text-[16px] flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(12,131,31,0.30)] transition-transform active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint focus-visible:ring-offset-2"
            >
              {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {paying ? "Processing…" : paymentMethod === "cash" ? "Request cash payment" : "Pay online & print"}
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Hidden file input — multiple files are merged into one PDF client-side */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf,image/*,.heic,.heif"
        className="sr-only"
        aria-hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          // append=true when the user already has a document loaded
          if (files.length > 0) void handleFilesSelect(files, fileState !== null);
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
    <Suspense fallback={<div className="min-h-full flex items-center justify-center"><Loader2 className="w-6 h-6 text-tint animate-spin" /></div>}>
      <PrintContent />
    </Suspense>
  );
}
