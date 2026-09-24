"use client";

// Swipeable document preview for the print flow.
// Renders PDFs page-by-page via pdfjs-dist (lazy-loaded), images directly.
// Reacts live to orientation, grayscale, numberUp, paperSize, and scaling
// so the user sees exactly how their print will look.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";

type PdfDocProxy = {
  numPages: number;
  getPage(n: number): Promise<PdfPageProxy>;
  destroy(): void;
};
type PdfPageProxy = {
  rotate?: number;
  getViewport(opts: { scale: number; rotation?: number }): { width: number; height: number };
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): {
    promise: Promise<void>;
    cancel(): void;
  };
};

interface FileItem {
  file: File;
  name: string;
  mime: string;
}

interface DocumentPreviewProps {
  files: FileItem[];
  className?: string;
  orientation?: "portrait" | "landscape";
  grayscale?: boolean;
  numberUp?: number;    // 1, 2, 4 — pages per sheet
  paperSize?: string;   // "A4", "A3", "Letter", "Legal", "A5"
  pageRange?: string | null;
  scaling?: string;     // "none" | "fit-to-page" | "shrink-to-fit"
}

interface PageIndex {
  fileIndex: number;
  pageInFile: number;
}

// Paper dimensions in mm — used to compute the correct aspect ratio per size.
const PAPER_DIMS: Record<string, [number, number]> = {
  A3: [297, 420], A4: [210, 297], A5: [148, 210],
  Letter: [216, 279], Legal: [216, 356],
};

function paperAspect(paper: string, orientation: "portrait" | "landscape"): string {
  const [w, h] = PAPER_DIMS[paper] ?? [210, 297];
  return orientation === "landscape" ? `${h}/${w}` : `${w}/${h}`;
}

export function DocumentPreview({
  files,
  className = "",
  orientation = "portrait",
  grayscale = false,
  numberUp = 1,
  paperSize = "A4",
  scaling = "none",
  pageRange = null,
}: DocumentPreviewProps) {
  const [current, setCurrent] = useState(0);
  const [pdfDocs, setPdfDocs] = useState<Record<number, PdfDocProxy | null>>({});
  const [pageCounts, setPageCounts] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<Record<string, string>>({});
  const [pageSizes, setPageSizes] = useState<Record<string, [number, number]>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const filesKey = files.map((f) => f.name + f.file.size).join("|");

  useEffect(() => {
    setCurrent(0);
    setRenderedPages({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesKey, pageRange, numberUp]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const version = (pdfjs as any).version as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pdfjs as any).GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

        const docs: Record<number, PdfDocProxy | null> = {};
        const counts: number[] = [];

        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (f.mime === "application/pdf") {
            const buf = await f.file.arrayBuffer();
            const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buf) });
            const doc = (await loadingTask.promise) as unknown as PdfDocProxy;
            if (cancelled) { doc.destroy(); return; }
            docs[i] = doc;
            counts.push(doc.numPages);
          } else {
            docs[i] = null;
            counts.push(1);
          }
        }

        if (!cancelled) {
          setPdfDocs(docs);
          setPageCounts(counts);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[DocumentPreview] load failed", err);
          setError("Couldn't render preview — file may be corrupted or password-protected.");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesKey]);

  const pages: PageIndex[] = useMemo(() => {
    const out: PageIndex[] = [];
    pageCounts.forEach((count, fi) => {
      for (let p = 1; p <= count; p++) out.push({ fileIndex: fi, pageInFile: p });
    });
    if (!pageRange) return out;
    const selected = new Set<number>();
    for (const part of pageRange.split(",")) {
      const match = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
      if (!match) return [];
      const start = Number(match[1]), end = Number(match[2] ?? match[1]);
      if (start < 1 || end < start || end > out.length) return [];
      for (let n=start;n<=end;n++) selected.add(n-1);
    }
    return out.filter((_,index)=>selected.has(index));
  }, [pageCounts, pageRange]);

  const useNUp = numberUp > 1;
  const nUpCols = numberUp === 9 ? 3 : 2;
  const nUpRows = Math.ceil(numberUp / nUpCols);

  // Pre-render current page + enough neighbours to populate n-up slots.
  useEffect(() => {
    if (pages.length === 0) return;
    const lookahead = Math.max(2, numberUp);
    const targets = Array.from({ length: lookahead }, (_, i) => current + i)
      .filter((i) => i >= 0 && i < pages.length);

    let cancelled = false;

    (async () => {
      for (const i of targets) {
        const key = `${i}_${orientation}_${numberUp}_${paperSize}`;
        if (renderedPages[key]) continue;

        const { fileIndex, pageInFile } = pages[i];
        const file = files[fileIndex];
        const doc = pdfDocs[fileIndex];

        const [pW, pH] = PAPER_DIMS[paperSize] ?? PAPER_DIMS.A4;
        const sheetW = orientation === "landscape" ? pH : pW;
        const sheetH = orientation === "landscape" ? pW : pH;
        const cols = useNUp ? nUpCols : 1;
        const rows = useNUp ? nUpRows : 1;
        const slotW = sheetW / cols;
        const slotH = sheetH / rows;
        const isSlotLandscape = slotW > slotH;

        if (!doc) {
          try {
            const img = new Image();
            const rawUrl = URL.createObjectURL(file.file);
            img.src = rawUrl;
            await new Promise((res) => {
              img.onload = () => res(null);
              img.onerror = () => res(null);
            });
            const imgW = img.naturalWidth || 800;
            const imgH = img.naturalHeight || 600;
            const isImgLandscape = imgW > imgH;
            const shouldRotate = isSlotLandscape !== isImgLandscape;

            if (shouldRotate) {
              const canvas = document.createElement("canvas");
              canvas.width = imgH;
              canvas.height = imgW;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.translate(0, imgW);
                ctx.rotate(-Math.PI / 2);
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                if (!cancelled) {
                  setPageSizes((prev) => ({ ...prev, [key]: [canvas.width, canvas.height] }));
                  setRenderedPages((prev) => ({ ...prev, [key]: dataUrl }));
                }
              }
            } else {
              if (!cancelled) {
                setPageSizes((prev) => ({ ...prev, [key]: [imgW, imgH] }));
                setRenderedPages((prev) => ({ ...prev, [key]: rawUrl }));
              }
            }
          } catch (err) {
            console.error("[DocumentPreview] render image failed", err);
          }
          continue;
        }

        try {
          const page = await doc.getPage(pageInFile);
          const baseViewport = page.getViewport({ scale: 1 });
          const isPageLandscape = baseViewport.width > baseViewport.height;
          const shouldRotate = isSlotLandscape !== isPageLandscape;

          const baseRotation = (page.rotate || 0);
          const rotation = (baseRotation + (shouldRotate ? 270 : 0)) % 360;
          const rotatedViewport = page.getViewport({ scale: 1, rotation });
          setPageSizes(prev => ({ ...prev, [key]: [rotatedViewport.width, rotatedViewport.height] }));

          const scale = Math.min(2, 800 / Math.max(rotatedViewport.width, rotatedViewport.height));
          const viewport = page.getViewport({ scale, rotation });

          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;

          if (!cancelled) {
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            setRenderedPages((prev) => ({ ...prev, [key]: dataUrl }));
          }
        } catch (err) {
          console.error("[DocumentPreview] render page failed", err);
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, pages, pdfDocs, numberUp, orientation, paperSize, renderedPages]);

  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0 && current < pages.length - 1) setCurrent(Math.min(Math.floor((pages.length - 1) / numberUp) * numberUp, current + numberUp));
      if (dx > 0 && current > 0) setCurrent(Math.max(0, current - numberUp));
    }
    startX.current = null;
  };

  const prev = () => setCurrent((c) => Math.max(0, c - numberUp));
  const next = () => setCurrent((c) => Math.min(Math.floor((pages.length - 1) / numberUp) * numberUp, c + numberUp));

  // Container aspect ratio: n-up always landscape; single page follows paper+orientation.
  const containerAspect = paperAspect(paperSize, orientation);
  const maxH = useNUp ? 280 : orientation === "landscape" ? 280 : 400;

  // Scaling controls how tightly the image fills the container.
  const imgPadding = 0;
  const [paperW, paperH] = PAPER_DIMS[paperSize] ?? PAPER_DIMS.A4;
  const sheetWidth = maxH * (orientation === "landscape" ? paperH / paperW : paperW / paperH);

  // ── Loading / error states ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className={`w-full bg-gray-50 rounded-2xl flex flex-col items-center justify-center gap-3 ${className}`}
        style={{ aspectRatio: containerAspect, maxHeight: maxH }}
      >
        <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
        <p className="text-xs text-gray-500">Preparing preview…</p>
      </div>
    );
  }

  if (error || pages.length === 0) {
    return (
      <div
        className={`w-full bg-gray-50 rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-4 ${className}`}
        style={{ aspectRatio: containerAspect, maxHeight: maxH }}
      >
        <FileText className="w-10 h-10 text-gray-300" />
        <p className="text-xs text-gray-500">{error ?? "No pages to preview"}</p>
      </div>
    );
  }

  const currentPage = pages[Math.min(current, pages.length - 1)];
  const currentFile = files[currentPage.fileIndex];
  const currentKey = `${current}_${orientation}_${numberUp}_${paperSize}`;
  const currentUrl = renderedPages[currentKey];

  // ── Shared image style ───────────────────────────────────────────────────────
  const imgStyle: React.CSSProperties = {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    filter: grayscale ? "grayscale(100%)" : "none",
    transition: "filter 0.25s ease, transform 0.3s ease",
    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
    borderRadius: 2,
    display: "block",
  };

  const sourceSize = pageSizes[currentKey];
  const sheetPoints = orientation === "landscape" ? [paperH * 72 / 25.4, paperW * 72 / 25.4] : [paperW * 72 / 25.4, paperH * 72 / 25.4];
  const fitScale = sourceSize ? Math.min(sheetPoints[0] / sourceSize[0], sheetPoints[1] / sourceSize[1]) : 1;
  const previewScale = scaling === "fit-to-page" ? fitScale : scaling === "shrink-to-fit" ? Math.min(1, fitScale) : 1;
  const previewWidth = sourceSize ? `${sourceSize[0] * previewScale / sheetPoints[0] * 100}%` : "100%";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={`w-full ${className}`}>
      <div
        className="relative w-full bg-gray-50 rounded-2xl overflow-hidden select-none"
        style={{ transition: "all 0.3s ease" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {useNUp ? (
          // ── N-up grid: tile pages in a grid showing the print sheet layout ──
          <div
            style={{
              aspectRatio: containerAspect,
              marginInline: "auto",
              width: `min(100%, ${sheetWidth}px)`,
              maxHeight: maxH,
              display: "grid",
              gridTemplateColumns: `repeat(${nUpCols}, 1fr)`,
              gridTemplateRows: `repeat(${nUpRows}, 1fr)`,
              gap: 4,
              padding: 10,
              background: "#f9fafb",
            }}
          >
            {Array.from({ length: numberUp }).map((_, i) => {
              const pageIdx = current + i;
              const pageKey = `${pageIdx}_${orientation}_${numberUp}_${paperSize}`;
              const url = pageIdx < pages.length
                ? (renderedPages[pageKey] ?? null)
                : null;
              return (
                <div
                  key={i}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 3,
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    padding: 3,
                  }}
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={`Page ${pageIdx + 1}`}
                      style={{
                        ...imgStyle,
                        boxShadow: "none",
                        // Pages beyond the first are dimmed to show they're "other" pages
                        opacity: 1,
                      }}
                    />
                  ) : pageIdx < pages.length ? (
                    <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                  ) : (
                    // Empty slot — fewer pages than n-up slots
                    <div style={{ width: "100%", height: "100%", background: "#f3f4f6" }} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // ── Single-page view with orientation + scaling ──────────────────────
          <div
            style={{
              aspectRatio: containerAspect,
              marginInline: "auto",
              width: `min(100%, ${sheetWidth}px)`,
              maxHeight: maxH,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: imgPadding,
              overflow: "hidden",
              background: "white",
              transition: "padding 0.25s ease, aspect-ratio 0.3s ease",
            }}
          >
            {currentUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUrl}
                alt={`${currentFile.name} — page ${currentPage.pageInFile}`}
                style={{
                  ...imgStyle,
                  width: previewWidth,
                  height: "auto",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />
            ) : (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Left / right chevrons */}
        {pages.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              disabled={current === 0}
              style={{ touchAction: "manipulation" }}
              aria-label="Previous page"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={current + numberUp >= pages.length}
              style={{ touchAction: "manipulation" }}
              aria-label="Next page"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          </>
        )}

        {/* Filename badge */}
        <div className="absolute top-2 left-2 max-w-[60%] bg-white/90 px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-700 truncate shadow-sm">
          {currentFile.name}
        </div>

        {/* Page counter (shows sheet count for n-up) */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-semibold rounded-full px-2.5 py-1">
          {useNUp
            ? `Sheet ${Math.ceil((current + 1) / numberUp)} / ${Math.ceil(pages.length / numberUp)}`
            : `${current + 1} / ${pages.length}`
          }
        </div>
      </div>

      {/* Dot indicators (cap at 10) */}
      {pages.length > 1 && pages.length <= 10 && !useNUp && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              style={{ touchAction: "manipulation" }}
              aria-label={`Go to page ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-6 bg-green-600" : "w-1.5 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
