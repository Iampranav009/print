"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Callers pass inline handlers; a ref keeps the effect from re-running (and refocusing) every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="hm-fade-in absolute inset-0 bg-black/35"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className="glass-sheet hm-sheet-in absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] max-w-2xl overflow-y-auto rounded-t-[28px] border-b-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] outline-none"
      >
        <div className="sticky top-0 -mx-5 flex flex-col items-center px-5 pt-2.5 pb-1">
          <span className="h-[5px] w-9 rounded-full bg-black/15" aria-hidden />
        </div>
        {title && (
          <div className="mb-4 mt-1 flex items-center justify-between">
            <h2 id={titleId} className="text-[20px] font-bold tracking-[-0.02em] text-label">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-500/12 text-zinc-600 active:scale-95"
            >
              <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
