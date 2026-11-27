import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { PrintOptions } from "@printbuddy/shared";
import { planSheet, slotCell, preparePrintPdf } from "../lib/print-layout";

const A4: [number, number] = [595.28, 841.89];
const M = 28.35 / 2;

describe("planSheet", () => {
  it("2-up portrait pages on portrait paper: stacked, turned (like a driver)", () => {
    expect(planSheet(A4[0], A4[1], A4[0], A4[1], 2, M)).toEqual({ cols: 1, rows: 2, rotate: true });
  });
  it("4-up and 9-up keep pages upright in a square grid", () => {
    expect(planSheet(A4[0], A4[1], A4[0], A4[1], 4, M)).toEqual({ cols: 2, rows: 2, rotate: false });
    expect(planSheet(A4[0], A4[1], A4[0], A4[1], 9, M)).toEqual({ cols: 3, rows: 3, rotate: false });
  });
  it("6-up portrait pages: 2 × 3 turned", () => {
    expect(planSheet(A4[0], A4[1], A4[0], A4[1], 6, M)).toEqual({ cols: 2, rows: 3, rotate: true });
  });
  it("2-up landscape slides on landscape paper: side by side, turned", () => {
    expect(planSheet(A4[1], A4[0], A4[1], A4[0], 2, M)).toEqual({ cols: 2, rows: 1, rotate: true });
  });
  it("does not turn a small page that already fits", () => {
    expect(planSheet(A4[0], A4[1], 300, 200, 1, 28.35, true).rotate).toBe(false);
  });
});

describe("slotCell", () => {
  it("reads left-to-right, top-to-bottom when upright", () => {
    const plan = { cols: 2, rows: 2, rotate: false };
    expect([0, 1, 2, 3].map((s) => slotCell(s, plan))).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]]);
  });
  it("follows the turned view when pages are rotated", () => {
    // Turned pages are read after rotating the sheet clockwise: bottom cell becomes the left one.
    expect([0, 1].map((s) => slotCell(s, { cols: 1, rows: 2, rotate: true }))).toEqual([[0, 1], [0, 0]]);
  });
});

describe("preparePrintPdf", () => {
  const options = (o: Partial<PrintOptions>): PrintOptions => ({
    copies: 1, color: false, orientation: "portrait", paper: "A4", duplex: false, duplex_edge: "long",
    pageRange: null, numberUp: 1, collate: true, quality: "normal", mediaType: "plain", reverse: false,
    scaling: "none", finishings: [], ...o,
  });
  async function sample(pages: number) {
    const pdf = await PDFDocument.create();
    for (let i = 0; i < pages; i++) pdf.addPage(A4);
    return pdf.save();
  }

  it("puts 9 pages on 2 sheets at 6-up", async () => {
    const out = await PDFDocument.load(await preparePrintPdf(await sample(9), options({ numberUp: 6 })));
    expect(out.getPageCount()).toBe(2);
  });
  it("uses landscape sheets when orientation is landscape", async () => {
    const out = await PDFDocument.load(await preparePrintPdf(await sample(1), options({ orientation: "landscape" })));
    const { width, height } = out.getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
  });
  it("rejects a page range outside the document", async () => {
    await expect(preparePrintPdf(await sample(3), options({ pageRange: "2-5" }))).rejects.toThrow(/page range/i);
  });
});
