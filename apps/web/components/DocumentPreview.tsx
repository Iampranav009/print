"use client";

// Swipeable preview for the print flow.
// - For a PDF: renders every page as a canvas thumbnail using pdfjs-dist,
//   shown one at a time with left/right swipe or dot navigation.
// - For an image: shows the image directly.
// - For multiple uploaded files: concatenates pages across files so the
//   user can swipe through the whole document as one continuous doc.
//
// Rendering is throttled (only the current page + its neighbours are
// rendered) so a 100-page PDF doesn't blow up memory on phones.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";

// pdfjs-dist v5 ships as ES modules — dynamic-import inside effect so it
// doesn't try to run on the server.
type PdfDocProxy = {
  numPages: number;
  getPage(n: number): Promise<PdfPageProxy>;
  destroy(): void;
};
type PdfPageProxy = {
  getViewport(opts: { scale: number }): { width: number; height: number };
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
  onRemove?: (index: number) => void;
  className?: string;
  orientation?: "portrait" | "landscape";
  grayscale?: boolean;
}

// Which physical page corresponds to a virtual page index.
interface PageIndex {
  fileIndex: number;
  pageInFile: number;
}

export function DocumentPreview({ files, className = "", orientation = "portrait", grayscale = false }: DocumentPreviewProps) {
  const [current, setCurrent] = useState(0);
  const [pdfDocs, setPdfDocs] = useState<Record<number, PdfDocProxy | null>>({});
  const [pageCounts, setPageCounts] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset when the file set changes
  useEffect(() => {
    setCurrent(0);
    setRenderedPages({});
  }, [files.map((f) => f.name + f.file.size).join("|")]);

  // Load PDFs and count pages
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Dynamic import so SSR doesn't touch pdfjs.
        // Worker: load from jsDelivr keyed to the installed version. This is
        // more reliable across Next dev (Turbopack) + Vercel prod than
        // asking the bundler to resolve pdf.worker.min.mjs itself.
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
            if (cancelled) {
              doc.destroy();
              return;
            }
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
          setError("Couldn't render preview — the file may be corrupted or password-protected.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.map((f) => f.name + f.file.size).join("|")]);

  // Flat list of virtual pages -> (fileIndex, pageInFile)
  const pages: PageIndex[] = useMemo(() => {
    const out: PageIndex[] = [];
    pageCounts.forEach((count, fi) => {
      for (let p = 1; p <= count; p++) {
        out.push({ fileIndex: fi, pageInFile: p });
      }
    });
    return out;
  }, [pageCounts]);

  // Render the current page (and eagerly the next one)
  useEffect(() => {
    if (pages.length === 0) return;
    const targets = [current, current + 1].filter(
      (i) => i >= 0 && i < pages.length
    );

    let cancelled = false;

    (async () => {
      for (const i of targets) {
        const key = `${i}`;
        if (renderedPages[key]) continue;

        const { fileIndex, pageInFile } = pages[i];
        const file = files[fileIndex];
        const doc = pdfDocs[fileIndex];

        if (!doc) {
          // Image — data URL from the file itself
          const url = URL.createObjectURL(file.file);
          if (!cancelled) {
            setRenderedPages((prev) => ({ ...prev, [key]: url }));
          }
          continue;
        }

        try {
          const page = await doc.getPage(pageInFile);
          // Target a max ~800px on the long edge so phones render fast.
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(2, 800 / Math.max(baseViewport.width, baseViewport.height));
          const viewport = page.getViewport({ scale });

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

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, pages, pdfDocs]);

  // Swipe handlers
  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0 && current < pages.length - 1) setCurrent(current + 1);
      if (dx > 0 && current > 0) setCurrent(current - 1);
    }
    startX.current = null;
  };

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(pages.length - 1, c + 1));

  const isLandscape = orientation === "landscape";

  if (loading) {
    return (
      <div
        className={`w-full bg-gray-50 rounded-2xl flex flex-col items-center justify-center gap-3 ${className}`}
        style={{ aspectRatio: isLandscape ? "4/3" : "3/4", maxHeight: isLandscape ? 300 : 400 }}
      >
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <p className="text-xs text-gray-500">Preparing preview…</p>
      </div>
    );
  }

  if (error || pages.length === 0) {
    return (
      <div
        className={`w-full bg-gray-50 rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-4 ${className}`}
        style={{ aspectRatio: isLandscape ? "4/3" : "3/4", maxHeight: isLandscape ? 300 : 400 }}
      >
        <FileText className="w-10 h-10 text-gray-300" />
        <p className="text-xs text-gray-500">{error ?? "No pages to preview"}</p>
      </div>
    );
  }

  const currentPage = pages[current];
  const currentFile = files[currentPage.fileIndex];
  const currentKey = `${current}`;
  const currentUrl = renderedPages[currentKey];

  return (
    <div className={`w-full ${className}`}>
      <div
        className="relative w-full bg-gray-50 rounded-2xl overflow-hidden select-none"
        style={{ transition: "all 0.3s ease" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Preview surface — aspect ratio and image transform both react to orientation */}
        <div
          className="w-full flex items-center justify-center p-4"
          style={{
            aspectRatio: isLandscape ? "4/3" : "3/4",
            maxHeight: isLandscape ? 300 : 400,
          }}
        >
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUrl}
              alt={`${currentFile.name} — page ${currentPage.pageInFile}`}
              className="object-contain shadow-md rounded"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                transform: isLandscape ? "rotate(90deg)" : "none",
                filter: grayscale ? "grayscale(100%)" : "none",
                transition: "transform 0.3s ease, filter 0.25s ease",
              }}
            />
          ) : (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Left / right chevrons (desktop / large-tap fallback) */}
        {pages.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              disabled={current === 0}
              style={{ touchAction: "manipulation" }}
              aria-label="Previous page"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={current === pages.length - 1}
              style={{ touchAction: "manipulation" }}
              aria-label="Next page"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          </>
        )}

        {/* File name badge */}
        <div className="absolute top-2 left-2 max-w-[60%] bg-white/90 px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-700 truncate shadow-sm">
          {currentFile.name}
        </div>

        {/* Page counter */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-semibold rounded-full px-2.5 py-1">
          {current + 1} / {pages.length}
        </div>
      </div>

      {/* Dot indicators (cap at 10 dots to keep phone layout tidy) */}
      {pages.length > 1 && pages.length <= 10 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              style={{ touchAction: "manipulation" }}
              aria-label={`Go to page ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-6 bg-blue-500" : "w-1.5 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
