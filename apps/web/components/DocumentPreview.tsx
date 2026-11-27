"use client";

// Print preview: lays out the real print PDF with the same preparePrintPdf the server
// uses, then renders each sheet with pdf.js. What the customer sees is what prints.

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import type { PrintOptions } from "@printbuddy/shared";
import { preparePrintPdf } from "@/lib/print-layout";

type PdfDoc = {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
  destroy(): void;
};
type PdfPage = {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void> };
};

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lib = pdfjs as any;
  lib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${lib.version}/build/pdf.worker.min.mjs`;
  return pdfjs;
}

interface DocumentPreviewProps {
  /** Print-ready source PDF (uploads are merged into one PDF before this). */
  pdf: File;
  options: PrintOptions;
  label: string;
  className?: string;
}

export function DocumentPreview({ pdf, options, label, className = "" }: DocumentPreviewProps) {
  const layoutKey = [options.paper, options.orientation, options.numberUp, options.pageRange ?? "", options.scaling, options.reverse].join("|");
  const [layout, setLayout] = useState<{ key: string; file: File; doc: PdfDoc | null; error?: string } | null>(null);
  const [sheet, setSheet] = useState(0);
  const [image, setImage] = useState<{ id: string; url: string; ratio: number } | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  // Build the print layout; debounced so typing a page range doesn't relayout per keystroke.
  useEffect(() => {
    let cancelled = false;
    let loaded: PdfDoc | null = null;
    const timer = setTimeout(async () => {
      try {
        const bytes = await preparePrintPdf(new Uint8Array(await pdf.arrayBuffer()), optionsRef.current);
        const pdfjs = await loadPdfjs();
        loaded = (await pdfjs.getDocument({ data: bytes }).promise) as unknown as PdfDoc;
        if (cancelled) return loaded.destroy();
        setLayout({ key: layoutKey, file: pdf, doc: loaded });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error && /page range/i.test(err.message)
          ? "Check the page range. It doesn't match this document."
          : "Couldn't preview this file. It may be password-protected or damaged.";
        setLayout({ key: layoutKey, file: pdf, doc: null, error: message });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      loaded?.destroy();
    };
  }, [pdf, layoutKey]);

  const current = layout && layout.key === layoutKey && layout.file === pdf ? layout : null;
  const sheetCount = current?.doc?.numPages ?? 0;
  const sheetIndex = Math.min(sheet, Math.max(0, sheetCount - 1));
  const imageId = `${layoutKey}:${sheetIndex}`;

  // Render the visible sheet.
  useEffect(() => {
    const doc = current?.doc;
    if (!doc) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await doc.getPage(sheetIndex + 1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2.5, 900 / Math.max(base.width, base.height)) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setImage({ id: imageId, url: canvas.toDataURL("image/jpeg", 0.88), ratio: base.width / base.height });
      } catch (err) {
        if (!cancelled) console.error("[DocumentPreview] render failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.doc, sheetIndex, imageId]);

  const startX = useRef<number | null>(null);
  const go = (delta: number) => setSheet(Math.min(Math.max(0, sheetIndex + delta), Math.max(0, sheetCount - 1)));
  const shown = image?.id === imageId ? image : null;
  const unit = options.numberUp > 1 ? "Sheet" : "Page";

  return (
    <div className={`w-full ${className}`}>
      <div
        className="relative flex h-[380px] select-none items-center justify-center overflow-hidden rounded-[20px] bg-zinc-500/[0.08] px-5 py-12"
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          startX.current = null;
        }}
      >
        {current?.error ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <FileText className="h-9 w-9 text-zinc-300" aria-hidden />
            <p className="max-w-[16rem] text-[13px] text-secondary-label">{current.error}</p>
          </div>
        ) : shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown.url}
            alt={`${label}: ${unit.toLowerCase()} ${sheetIndex + 1} of ${sheetCount}`}
            className="max-h-full max-w-full rounded-[3px] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.14)] transition-[filter] duration-300"
            style={{ aspectRatio: shown.ratio, filter: options.color ? "none" : "grayscale(1)" }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-tint" aria-hidden />
            <p className="text-[12px] text-secondary-label">Preparing preview…</p>
          </div>
        )}

        {sheetCount > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={sheetIndex === 0}
              aria-label={`Previous ${unit.toLowerCase()}`}
              className="glass-chrome absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-700" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={sheetIndex >= sheetCount - 1}
              aria-label={`Next ${unit.toLowerCase()}`}
              className="glass-chrome absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4 text-zinc-700" />
            </button>
          </>
        )}

        <div className="glass-chrome absolute left-3 top-3 max-w-[55%] truncate rounded-full px-2.5 py-1 text-[11px] font-medium text-zinc-700">
          {label}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
          {options.color ? "Colour" : "Black & white"}
        </div>
        {sheetCount > 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white">
            {unit} {sheetIndex + 1} / {sheetCount}
          </div>
        )}
      </div>
    </div>
  );
}
