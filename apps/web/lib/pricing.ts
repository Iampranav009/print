import type { Pricing, PrintOptions, PriceBreakdown } from "@printbuddy/shared";

export function parsePageRange(
  range: string | null,
  totalPages: number
): number {
  if (!range) return totalPages;
  const pages = new Set<number>();
  for (const part of range.split(",")) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!match) throw new Error("Enter a valid page range, such as 1-3,5");
    const start = Number(match[1]), end = Number(match[2] ?? match[1]);
    if (start < 1 || end > totalPages || end < start) throw new Error("Page range is outside this document");
    for (let page = start; page <= end; page++) pages.add(page);
  }
  return pages.size;
}

export function computePrice(
  pricing: Pricing,
  options: PrintOptions,
  totalPages: number
): PriceBreakdown {
  if (!Number.isInteger(options.copies) || options.copies < 1 || options.copies > 99) throw new Error("Copies must be between 1 and 99");
  if (![1, 2, 4, 6, 9].includes(options.numberUp)) throw new Error("Unsupported pages per sheet");
  const selected_pages = parsePageRange(options.pageRange, totalPages);
  const number_up = Math.max(options.numberUp || 1, 1);
  const sides = Math.ceil(selected_pages / number_up);

  const per_side_base = options.color
    ? pricing.color_page_paise
    : pricing.bw_page_paise;

  const a3_applied = options.paper === "A3";
  let per_side = a3_applied
    ? Math.round(per_side_base * Number(pricing.a3_multiplier))
    : per_side_base;

  const media_type_surcharge =
    pricing.media_type_surcharges?.[options.mediaType || "plain"] ?? 0;
  per_side += media_type_surcharge;

  const copies = options.copies;
  let subtotal = per_side * sides * copies;

  const duplex_factor_applied = options.duplex ? Number(pricing.duplex_factor) : 1;
  subtotal = options.duplex
    ? Math.round(per_side * (Math.floor(sides / 2) * 2 * duplex_factor_applied + sides % 2) * copies)
    : subtotal;

  const min_charge_applied = subtotal < pricing.min_charge_paise;
  const price_paise = Math.max(subtotal, pricing.min_charge_paise);

  return {
    selected_pages,
    number_up,
    sides,
    copies,
    per_side_base,
    a3_applied,
    media_type_surcharge,
    duplex_factor_applied,
    subtotal,
    min_charge_applied,
    price_paise,
  };
}
