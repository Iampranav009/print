"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { PrinterCapabilities, PriceBreakdown } from "@printbuddy/shared";
import { Pill } from "@/components/Pill";
import { ControlSection } from "@/components/ControlSection";
import { Toggle } from "@/components/Toggle";
import { ToggleRow } from "@/components/ToggleRow";
import { EmptyState } from "@/components/EmptyState";
import {
  Upload,
  FileText,
  X,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  QrCode,
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

function validatePageRange(
  range: string,
  totalPages: number
): { valid: boolean; pageCount: number; error: string | null } {
  if (!range.trim()) return { valid: false, pageCount: 0, error: "Enter a page range" };
  let count = 0;
  for (const part of range.split(",")) {
    const t = part.trim();
    if (!t) continue;
    if (t.includes("-")) {
      const [a, b] = t.split("-");
      const s = parseInt(a, 10),
        e = parseInt(b, 10);
      if (isNaN(s) || isNaN(e)) return { valid: false, pageCount: 0, error: `Invalid range "${t}"` };
      if (s < 1 || e > totalPages || s > e)
        return { valid: false, pageCount: 0, error: `Pages ${s}–${e} out of range (1–${totalPages})` };
      count += e - s + 1;
    } else {
      const pg = parseInt(t, 10);
      if (isNaN(pg)) return { valid: false, pageCount: 0, error: `"${t}" is not a page number` };
      if (pg < 1 || pg > totalPages)
        return { valid: false, pageCount: 0, error: `Page ${pg} doesn't exist (1–${totalPages})` };
      count++;
    }
  }
  return count > 0
    ? { valid: true, pageCount: count, error: null }
    : { valid: false, pageCount: 0, error: "Enter at least one page" };
}

function defaultConfig(caps: PrinterCapabilities): Config {
  return {
    copies: 1,
    color: false,
    orientation: "portrait",
    paper: caps.media[0] || "A4",
    duplex: false,
    duplex_edge: "long",
    useCustomRange: false,
    pageRange: "",
    numberUp: 1,
    collate: true,
    quality: caps.quality.includes("normal") ? "normal" : caps.quality[0] || "normal",
    mediaType: "plain",
    reverse: false,
    scaling: "none",
    finishings: [],
  };
}

function buildOptions(config: Config) {
  return {
    copies: config.copies,
    color: config.color,
    orientation: config.orientation,
    paper: config.paper,
    duplex: config.duplex,
    duplex_edge: config.duplex_edge,
    pageRange: config.useCustomRange && config.pageRange ? config.pageRange : null,
    numberUp: config.numberUp,
    collate: config.collate,
    quality: config.quality,
    mediaType: config.mediaType,
    reverse: config.reverse,
    scaling: config.scaling,
    finishings: config.finishings,
  };
}

function uploadWithProgress(
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

// ── Print Content Component ───────────────────────────────────────────────────

function PrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shopId = searchParams.get("shop");

  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);

  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "counting" | "done" | "error"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileState, setFileState] = useState<FileState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<Config | null>(null);

  const [priceState, setPriceState] = useState<"idle" | "fetching" | "ready" | "error">("idle");
  const [rawPriceResult, setRawPriceResult] = useState<PriceResult | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const [paying, setPaying] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Derived loading state
  const loadingShop = Boolean(shopId && !shopData && !shopError);

  // Fetch shop data
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
        if (data.capabilities) {
          setConfig(defaultConfig(data.capabilities));
        }
      } catch (err: unknown) {
        if (!active) return;
        setShopError(err instanceof Error ? err.message : "Shop not found");
      }
    }

    loadShop();

    return () => {
      active = false;
    };
  }, [shopId]);

  // Derived capabilities
  const caps = shopData?.capabilities ?? null;

  const pageRangeValidation = useMemo(() => {
    if (!config?.useCustomRange || !fileState)
      return { valid: true, pageCount: fileState?.totalPages ?? 0, error: null };
    return validatePageRange(config.pageRange, fileState.totalPages);
  }, [config, fileState]);

  const priceResult =
    config?.useCustomRange && !pageRangeValidation.valid ? null : rawPriceResult;

  const canPay =
    !!fileState &&
    !!config &&
    pageRangeValidation.valid &&
    priceState !== "fetching" &&
    !!priceResult &&
    !paying;

  // Price calculation (debounced)
  useEffect(() => {
    if (!fileState || !shopId || !config || (config.useCustomRange && !pageRangeValidation.valid)) {
      return;
    }

    const timer = setTimeout(async () => {
      setPriceState("fetching");
      try {
        const res = await fetch("/api/price-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopId,
            totalPages: fileState.totalPages,
            options: buildOptions(config),
          }),
        });
        if (!res.ok) throw new Error("Price calculation failed");
        const data = await res.json();
        setRawPriceResult(data);
        setPriceState("ready");
      } catch {
        setPriceState("error");
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [config, fileState, shopId, pageRangeValidation.valid]);

  const updateConfig = useCallback((updater: (prev: Config) => Config) => {
    setConfig((prev) => (prev ? updater(prev) : prev));
    setPendingJobId(null);
    setPendingOrderId(null);
    setPendingAmount(null);
    setCapabilityError(null);
  }, []);

  // Handle File Selection
  const handleFileSelect = useCallback(
    async (file: File) => {
      const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];
      const MAX_BYTES = 50 * 1024 * 1024;
      if (!ALLOWED.includes(file.type)) {
        setUploadError("Only PDF, JPG, or PNG files are supported.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setUploadError("File must be under 50 MB.");
        return;
      }
      setUploadError(null);
      setUploadState("uploading");
      setUploadProgress(0);
      setRawPriceResult(null);
      setPriceState("idle");
      setPendingJobId(null);
      setPendingOrderId(null);
      setPendingAmount(null);

      try {
        const signRes = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mime: file.type, size: file.size, shopId }),
        });
        if (!signRes.ok) {
          const err = await signRes.json();
          throw new Error(err.error || "Upload failed");
        }
        const { signedUrl, filePath } = await signRes.json();
        await uploadWithProgress(signedUrl, file, setUploadProgress);

        setUploadState("counting");
        const countRes = await fetch("/api/uploads/page-count", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filePath, mime: file.type }),
        });
        const countData = countRes.ok ? await countRes.json() : { pageCount: 1 };
        const totalPages: number = countData.pageCount || 1;
        setFileState({ file, path: filePath, mime: file.type, totalPages });
        setUploadState("done");
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
        setUploadState("error");
      }
    },
    [shopId]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      e.target.value = "";
    },
    [handleFileSelect]
  );

  const resetFile = useCallback(() => {
    setFileState(null);
    setUploadState("idle");
    setUploadError(null);
    setRawPriceResult(null);
    setPriceState("idle");
    setPendingJobId(null);
    setPendingOrderId(null);
    setPendingAmount(null);
  }, []);

  // Pay Action
  const handlePay = useCallback(async () => {
    if (!canPay || !fileState || !config || !shopData) return;
    if (!(window as unknown as RazorpayWindow).Razorpay) {
      setPayError("Payment service is loading — please retry in a moment.");
      return;
    }
    setPayError(null);
    setCapabilityError(null);
    setPaying(true);

    try {
      let jobId = pendingJobId;
      let orderId = pendingOrderId;
      let amount = pendingAmount;

      if (!jobId || !orderId) {
        const jobRes = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopId,
            filePath: fileState.path,
            fileMime: fileState.mime,
            options: buildOptions(config),
          }),
        });

        if (!jobRes.ok) {
          const err = await jobRes.json();
          if (jobRes.status === 422) {
            setCapabilityError(err.error || "Option not supported by this printer");
            setPaying(false);
            return;
          }
          throw new Error(err.error || "Failed to create print job");
        }

        const createdJob = await jobRes.json();
        jobId = createdJob.jobId as string;
        amount = createdJob.pricePaise as number;

        const payRes = await fetch(`/api/jobs/${jobId}/pay`, { method: "POST" });
        if (!payRes.ok) throw new Error("Failed to create payment order");
        const payData = await payRes.json();
        orderId = payData.orderId as string;

        setPendingJobId(jobId);
        setPendingOrderId(orderId);
        setPendingAmount(amount);
      }

      const rzp = new (window as unknown as RazorpayWindow).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: "INR",
        order_id: orderId,
        name: shopData.shop.name,
        description: fileState.file.name,
        config: { display: { sequence: ["upi", "card", "netbanking", "wallet"] } },
        handler: () => {
          router.push(`/app/history/${jobId}`);
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });

      rzp.open();
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "Payment failed");
      setPaying(false);
    }
  }, [canPay, fileState, config, shopData, shopId, pendingJobId, pendingOrderId, pendingAmount, router]);

  // 1. Missing shop query state
  if (!shopId) {
    return (
      <div className="flex-1 flex flex-col justify-center min-h-[calc(100dvh-130px)] px-4 py-8">
        <EmptyState
          icon={<QrCode className="w-8 h-8" />}
          title="No printer selected"
          subtitle="Scan the QR code displayed on the printer screen to start your print session."
          actionText="Scan QR code"
          actionHref="/app/scan"
        />
      </div>
    );
  }

  // 2. Loading shop
  if (loadingShop) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 min-h-[calc(100dvh-130px)]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  // 3. Shop error
  if (shopError || !shopData) {
    return (
      <div className="flex-1 flex flex-col justify-center min-h-[calc(100dvh-130px)] px-4 py-8">
        <EmptyState
          icon={<AlertCircle className="w-8 h-8 text-red-500" />}
          title="Printer not found"
          subtitle="This printer node is either offline or the QR code has expired. Please try scanning again."
          actionText="Scan another printer"
          actionHref="/app/scan"
        />
      </div>
    );
  }

  // Capability calculations
  const hasCaps = !!caps;
  const twoSidedLong = caps?.sides.includes("two-sided-long-edge") ?? false;
  const twoSidedShort = caps?.sides.includes("two-sided-short-edge") ?? false;
  const canDuplex = twoSidedLong || twoSidedShort;
  const canChooseDuplexEdge = config?.duplex && twoSidedLong && twoSidedShort;
  const showPaperType = (caps?.media_types ?? []).filter((t) => t !== "plain").length > 0;
  const showNup = (caps?.number_up ?? [1]).some((n) => n > 1);
  const showQuality = (caps?.quality ?? ["normal"]).length > 1;
  const showScaling = (caps?.scaling ?? ["none"]).some((s) => s !== "none");
  const showFinishings = (caps?.finishings ?? []).length > 0;
  const showCollate = !!(config && config.copies > 1 && caps?.collate);
  const hasAdvanced =
    showNup || showQuality || showScaling || showFinishings || caps?.reverse || showCollate;

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-32">
      {/* 1. Shop Header Card */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-100 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 text-2xl leading-none select-none shadow-sm shadow-indigo-600/20">
          🖨️
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-zinc-900 leading-tight truncate">
            {shopData.shop.name}
          </h1>
          {shopData.shop.location && (
            <p className="text-xs text-zinc-500 mt-0.5 truncate">
              {shopData.shop.location}
            </p>
          )}
        </div>
      </div>

      {/* 2. Upload Zone (Idle, Uploading, Counting, Error) */}
      {(uploadState === "idle" ||
        uploadState === "uploading" ||
        uploadState === "counting" ||
        uploadState === "error") && (
        <div className="space-y-3">
          <label className="block cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={handleInputChange}
              disabled={uploadState === "uploading" || uploadState === "counting"}
              aria-label="Upload file to print"
            />
            <div
              className={`border-2 border-dashed rounded-2xl text-center transition-colors ${
                uploadState === "uploading" || uploadState === "counting"
                  ? "border-zinc-300 bg-zinc-50 p-8"
                  : uploadState === "error"
                  ? "border-red-300 bg-red-50/50 p-8"
                  : "border-zinc-200 hover:border-zinc-300 active:border-zinc-400 active:bg-zinc-50 p-10"
              }`}
            >
              {uploadState === "uploading" ? (
                <div className="space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-sm font-medium text-zinc-700">
                    Uploading… {uploadProgress}%
                  </p>
                  <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden max-w-xs mx-auto">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : uploadState === "counting" ? (
                <div className="space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-sm font-medium text-zinc-700">
                    Reading document…
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-600">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      Tap to upload your file
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      PDF · JPG · PNG • max 50 MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </label>

          {uploadError && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-red-50 text-red-700 rounded-xl p-3.5 text-xs"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Post-upload Flow: File Card & Options */}
      {uploadState === "done" && fileState && config && (
        <div className="space-y-4">
          {/* File Card */}
          <div className="flex items-center gap-3 bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80 shadow-sm">
            <div className="w-10 h-10 bg-zinc-200 rounded-xl flex items-center justify-center flex-shrink-0 text-zinc-500">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">
                {fileState.file.name}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {fileState.totalPages} page{fileState.totalPages !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={resetFile}
              aria-label="Remove and choose another file"
              style={{ touchAction: "manipulation" }}
              className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 active:bg-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Capability / Payment Errors */}
          {capabilityError && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-amber-50 text-amber-800 rounded-xl p-3.5 text-xs"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{capabilityError}</span>
            </div>
          )}
          {payError && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-red-50 text-red-700 rounded-xl p-3.5 text-xs"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{payError}</span>
            </div>
          )}

          {/* 4. Options Card */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm space-y-4">
            {/* Copies */}
            <div className="pb-4 border-b border-zinc-100">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Copies
              </p>
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => updateConfig((c) => ({ ...c, copies: Math.max(1, c.copies - 1) }))}
                  disabled={config.copies <= 1}
                  aria-label="Decrease copies"
                  style={{ touchAction: "manipulation" }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span
                  className="text-2xl font-bold w-12 text-center tabular-nums text-zinc-900"
                  aria-live="polite"
                  aria-atomic
                >
                  {config.copies}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateConfig((c) => ({
                      ...c,
                      copies: Math.min(caps?.max_copies ?? 99, c.copies + 1),
                    }))
                  }
                  disabled={config.copies >= (caps?.max_copies ?? 99)}
                  aria-label="Increase copies"
                  style={{ touchAction: "manipulation" }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pages Range */}
            <ControlSection label="Pages">
              <Pill
                flex1
                active={!config.useCustomRange}
                onClick={() => updateConfig((c) => ({ ...c, useCustomRange: false, pageRange: "" }))}
              >
                All {fileState.totalPages} pages
              </Pill>
              <Pill
                flex1
                active={config.useCustomRange}
                onClick={() => updateConfig((c) => ({ ...c, useCustomRange: true }))}
              >
                Custom range
              </Pill>
            </ControlSection>

            {config.useCustomRange && (
              <div className="pb-4 border-b border-zinc-100 -mt-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1-3, 5, 8-10"
                  value={config.pageRange}
                  onChange={(e) => updateConfig((c) => ({ ...c, pageRange: e.target.value }))}
                  aria-label="Custom page range"
                  aria-describedby="range-hint"
                  className={`w-full min-h-[48px] border rounded-xl px-3.5 py-2.5 text-sm bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 transition-colors ${
                    pageRangeValidation.error
                      ? "border-red-400 focus:ring-red-400"
                      : "border-zinc-200 focus:ring-indigo-600"
                  }`}
                />
                <p
                  id="range-hint"
                  className={`text-xs mt-1.5 ${
                    pageRangeValidation.error ? "text-red-600 font-medium" : "text-zinc-500"
                  }`}
                >
                  {pageRangeValidation.error
                    ? pageRangeValidation.error
                    : pageRangeValidation.pageCount > 0
                    ? `${pageRangeValidation.pageCount} of ${fileState.totalPages} pages selected`
                    : `Enter page numbers between 1 and ${fileState.totalPages}`}
                </p>
              </div>
            )}

            {/* Color */}
            {hasCaps && !caps.color ? (
              <div className="border-b border-zinc-100 pb-4">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Color
                </p>
                <p className="text-sm font-medium text-zinc-600">Black &amp; white only</p>
              </div>
            ) : (
              <ControlSection label="Color">
                <Pill
                  flex1
                  active={!config.color}
                  onClick={() => updateConfig((c) => ({ ...c, color: false }))}
                  aria-label="Black and white"
                >
                  B&amp;W
                </Pill>
                {(!hasCaps || caps.color) && (
                  <Pill
                    flex1
                    active={config.color}
                    onClick={() => updateConfig((c) => ({ ...c, color: true }))}
                    aria-label="Colour"
                  >
                    Colour
                  </Pill>
                )}
              </ControlSection>
            )}

            {/* Orientation */}
            <ControlSection label="Orientation">
              <Pill
                flex1
                active={config.orientation === "portrait"}
                onClick={() => updateConfig((c) => ({ ...c, orientation: "portrait" }))}
              >
                Portrait
              </Pill>
              <Pill
                flex1
                active={config.orientation === "landscape"}
                onClick={() => updateConfig((c) => ({ ...c, orientation: "landscape" }))}
              >
                Landscape
              </Pill>
            </ControlSection>

            {/* Sides */}
            {canDuplex && (
              <>
                <ControlSection label="Sides">
                  <Pill
                    flex1
                    active={!config.duplex}
                    onClick={() => updateConfig((c) => ({ ...c, duplex: false }))}
                  >
                    Single-sided
                  </Pill>
                  <Pill
                    flex1
                    active={config.duplex}
                    onClick={() => updateConfig((c) => ({ ...c, duplex: true }))}
                  >
                    Double-sided
                  </Pill>
                </ControlSection>

                {canChooseDuplexEdge && (
                  <ControlSection label="Binding edge">
                    <Pill
                      flex1
                      active={config.duplex_edge === "long"}
                      onClick={() => updateConfig((c) => ({ ...c, duplex_edge: "long" }))}
                    >
                      Long edge
                    </Pill>
                    <Pill
                      flex1
                      active={config.duplex_edge === "short"}
                      onClick={() => updateConfig((c) => ({ ...c, duplex_edge: "short" }))}
                    >
                      Short edge
                    </Pill>
                  </ControlSection>
                )}
              </>
            )}

            {/* Paper Size */}
            {(caps?.media ?? ["A4"]).length > 1 && (
              <ControlSection label="Paper size">
                {(caps?.media ?? ["A4"]).map((size) => (
                  <Pill
                    key={size}
                    active={config.paper === size}
                    onClick={() => updateConfig((c) => ({ ...c, paper: size }))}
                  >
                    {size}
                  </Pill>
                ))}
              </ControlSection>
            )}

            {/* Paper Type */}
            {showPaperType && (
              <ControlSection label="Paper type">
                {(caps?.media_types ?? ["plain"]).map((type) => (
                  <Pill
                    key={type}
                    active={config.mediaType === type}
                    onClick={() => updateConfig((c) => ({ ...c, mediaType: type }))}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Pill>
                ))}
              </ControlSection>
            )}

            {/* Collapsible Advanced Options */}
            {hasAdvanced && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((o) => !o)}
                  style={{ touchAction: "manipulation" }}
                  className="w-full flex items-center justify-between py-3 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg"
                >
                  <span>Advanced options</span>
                  <ChevronRight
                    className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                      advancedOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {advancedOpen && (
                  <div className="pt-2 border-t border-zinc-100 space-y-4">
                    {showNup && (
                      <ControlSection label="Pages per sheet">
                        {(caps?.number_up ?? [1]).map((n) => (
                          <Pill
                            key={n}
                            active={config.numberUp === n}
                            onClick={() => updateConfig((c) => ({ ...c, numberUp: n }))}
                            aria-label={`${n} pages per sheet`}
                          >
                            {n}
                          </Pill>
                        ))}
                      </ControlSection>
                    )}

                    {showQuality && (
                      <ControlSection label="Quality">
                        {(caps?.quality ?? ["normal"]).map((q) => (
                          <Pill
                            key={q}
                            active={config.quality === q}
                            onClick={() => updateConfig((c) => ({ ...c, quality: q }))}
                          >
                            {q.charAt(0).toUpperCase() + q.slice(1)}
                          </Pill>
                        ))}
                      </ControlSection>
                    )}

                    {showScaling && (
                      <ControlSection label="Scaling">
                        {(caps?.scaling ?? ["none"]).map((s) => (
                          <Pill
                            key={s}
                            active={config.scaling === s}
                            onClick={() => updateConfig((c) => ({ ...c, scaling: s }))}
                          >
                            {s === "none" ? "None" : s === "fit-to-page" ? "Fit to page" : "Shrink to fit"}
                          </Pill>
                        ))}
                      </ControlSection>
                    )}

                    {showFinishings && (
                      <ControlSection label="Finishing">
                        {(caps?.finishings ?? []).map((f) => {
                          const active = config.finishings.includes(f);
                          return (
                            <Pill
                              key={f}
                              active={active}
                              onClick={() =>
                                updateConfig((c) => ({
                                  ...c,
                                  finishings: active
                                    ? c.finishings.filter((x) => x !== f)
                                    : [...c.finishings, f],
                                }))
                              }
                            >
                              {f.charAt(0).toUpperCase() + f.slice(1)}
                            </Pill>
                          );
                        })}
                      </ControlSection>
                    )}

                    {showCollate && (
                      <ToggleRow label="Collate copies" id="collate-toggle">
                        <Toggle
                          checked={config.collate}
                          onChange={() => updateConfig((c) => ({ ...c, collate: !c.collate }))}
                          aria-labelledby="collate-toggle"
                        />
                      </ToggleRow>
                    )}

                    {caps?.reverse && (
                      <ToggleRow label="Reverse order" id="reverse-toggle" noDivider>
                        <Toggle
                          checked={config.reverse}
                          onChange={() => updateConfig((c) => ({ ...c, reverse: !c.reverse }))}
                          aria-labelledby="reverse-toggle"
                        />
                      </ToggleRow>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Fixed Price Bar (Above TabBar) */}
      {fileState && uploadState === "done" && (
        <div
          className="fixed bottom-[calc(64px+max(8px,env(safe-area-inset-bottom)))] inset-x-0 z-30 bg-white border-t border-zinc-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        >
          <div className="max-w-lg mx-auto px-4 py-3">
            {/* Expandable Breakdown Card */}
            {breakdownOpen && priceResult && (
              <div className="mb-3 bg-zinc-50 rounded-2xl p-4 text-xs space-y-1.5 text-zinc-600 border border-zinc-100 shadow-inner">
                <p>
                  {priceResult.breakdown.selected_pages} page
                  {priceResult.breakdown.selected_pages !== 1 ? "s" : ""} ÷{" "}
                  {priceResult.breakdown.number_up} per sheet = {priceResult.breakdown.sides} side
                  {priceResult.breakdown.sides !== 1 ? "s" : ""}
                </p>
                <p>
                  {formatPaise(priceResult.breakdown.per_side_base)}/side (
                  {config?.color ? "colour" : "B&W"})
                  {priceResult.breakdown.a3_applied ? " × 2× A3" : ""}
                </p>
                {priceResult.breakdown.media_type_surcharge > 0 && (
                  <p>
                    + {formatPaise(priceResult.breakdown.media_type_surcharge)}/side (
                    {config?.mediaType})
                  </p>
                )}
                <p>
                  × {priceResult.breakdown.copies} cop{priceResult.breakdown.copies !== 1 ? "ies" : "y"}
                </p>
                {config?.duplex && priceResult.breakdown.duplex_factor_applied !== 1 && (
                  <p>
                    Duplex saving: ×{priceResult.breakdown.duplex_factor_applied.toFixed(2)}
                  </p>
                )}
                {priceResult.breakdown.min_charge_applied && (
                  <p className="text-amber-600 font-medium">Minimum order charge applied</p>
                )}
                <div className="border-t border-zinc-200 pt-2 flex justify-between font-semibold text-sm text-zinc-900">
                  <span>Total</span>
                  <span>{formatPaise(priceResult.breakdown.price_paise)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Price + Breakdown Toggle */}
              <button
                type="button"
                onClick={() => setBreakdownOpen((o) => !o)}
                disabled={!priceResult}
                aria-label={breakdownOpen ? "Hide price breakdown" : "Show price breakdown"}
                aria-expanded={breakdownOpen}
                style={{ touchAction: "manipulation" }}
                className="flex items-center gap-1.5 min-h-[54px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl px-1"
              >
                <span
                  className={`text-2xl font-bold tabular-nums text-zinc-900 transition-opacity ${
                    priceState === "fetching" ? "opacity-40" : ""
                  }`}
                >
                  {priceResult ? formatPaise(priceResult.pricePaise) : "—"}
                </span>
                {priceState === "fetching" && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                )}
                {priceResult &&
                  (breakdownOpen ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ))}
              </button>

              {/* Pay Button */}
              <button
                type="button"
                onClick={handlePay}
                disabled={!canPay}
                style={{ touchAction: "manipulation" }}
                className="flex-1 min-h-[54px] bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-2xl text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                {paying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Opening…
                  </span>
                ) : priceResult ? (
                  `Pay ${formatPaise(priceResult.pricePaise)}`
                ) : (
                  "Pay"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 min-h-[calc(100dvh-130px)]">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      }
    >
      <PrintContent />
    </Suspense>
  );
}
