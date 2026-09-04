import type { Pricing, PrintOptions, PriceBreakdown } from "@printbuddy/shared";

export function parsePageRange(
  range: string | null,
  totalPages: number
): number {
  if (!range) return totalPages;
  let count = 0;
  for (const part of range.split(",")) {
    const trimmed = part.trim();
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = Math.max(1, parseInt(startStr, 10));
      const end = Math.min(totalPages, parseInt(endStr, 10));
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        count += end - start + 1;
      }
    } else {
      const page = parseInt(trimmed, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        count += 1;
      }
    }
  }
  return Math.max(count, 1);
}

export function computePrice(
  pricing: Pricing,
  options: PrintOptions,
  totalPages: number
): PriceBreakdown {
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
  subtotal = Math.round(subtotal * duplex_factor_applied);

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
