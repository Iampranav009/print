import { describe, it, expect } from "vitest";
import { computePrice, parsePageRange } from "../lib/pricing";
import type { Pricing, PrintOptions } from "@printbuddy/shared";

const P: Pricing = {
  bw_page_paise: 100,
  color_page_paise: 500,
  a3_multiplier: 2,
  duplex_factor: 0.9,
  min_charge_paise: 200,
  media_type_surcharges: { photo: 300 },
};

const O: PrintOptions = {
  copies: 1,
  color: false,
  orientation: "portrait",
  paper: "A4",
  duplex: false,
  duplex_edge: "long",
  pageRange: null,
  numberUp: 1,
  collate: true,
  quality: "normal",
  mediaType: "plain",
  reverse: false,
  scaling: "none",
  finishings: [],
};

describe("computePrice", () => {
  it("B&W A4: pages × bw_page_paise", () => {
    expect(computePrice(P, O, 10).price_paise).toBe(1000);
  });

  it("color A4: pages × color_page_paise", () => {
    expect(computePrice(P, { ...O, color: true }, 4).price_paise).toBe(2000);
  });

  it("copies multiplier scales total", () => {
    expect(computePrice(P, { ...O, copies: 3 }, 4).price_paise).toBe(1200);
  });

  it("A3 multiplier doubles per-side cost", () => {
    // 2 pages × (100 × 2) = 400
    expect(computePrice(P, { ...O, paper: "A3" }, 2).price_paise).toBe(400);
  });

  it("media type surcharge adds per side", () => {
    // 2 pages × (100 + 300) = 800
    expect(computePrice(P, { ...O, mediaType: "photo" }, 2).price_paise).toBe(800);
  });

  it("min charge applied when subtotal is below floor", () => {
    const r = computePrice(P, O, 1); // 1 × 100 = 100 < 200
    expect(r.price_paise).toBe(200);
    expect(r.min_charge_applied).toBe(true);
  });

  it("duplex reduces cost (0.9 factor on paired sides)", () => {
    // 10 pages → 10 sides; duplex: floor(10/2)*2*0.9 + 0 = 9 → 100*9 = 900
    const r = computePrice(P, { ...O, duplex: true }, 10);
    expect(r.price_paise).toBe(900);
    expect(r.duplex_factor_applied).toBe(0.9);
  });

  it("page range restricts billed pages", () => {
    // only pages 1-3 of 10 → 3 × 100 = 300
    expect(computePrice(P, { ...O, pageRange: "1-3" }, 10).price_paise).toBe(300);
  });

  it("rejects copies < 1", () => {
    expect(() => computePrice(P, { ...O, copies: 0 }, 1)).toThrow();
  });

  it("rejects copies > 99", () => {
    expect(() => computePrice(P, { ...O, copies: 100 }, 1)).toThrow();
  });

  it("rejects unsupported numberUp", () => {
    expect(() => computePrice(P, { ...O, numberUp: 3 }, 4)).toThrow();
  });
});

describe("parsePageRange", () => {
  it("null returns total pages", () => {
    expect(parsePageRange(null, 10)).toBe(10);
  });

  it("single page", () => {
    expect(parsePageRange("3", 10)).toBe(1);
  });

  it("range 1-5 returns 5", () => {
    expect(parsePageRange("1-5", 10)).toBe(5);
  });

  it("overlapping ranges are deduplicated", () => {
    expect(parsePageRange("1-3,2-4", 10)).toBe(4);
  });

  it("throws when range exceeds total", () => {
    expect(() => parsePageRange("1-11", 10)).toThrow();
  });

  it("throws on invalid format", () => {
    expect(() => parsePageRange("a-b", 10)).toThrow();
  });
});
