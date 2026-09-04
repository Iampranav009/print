export type JobStatus =
  | "priced"
  | "awaiting_payment"
  | "paid"
  | "dispatched"
  | "awaiting_release"
  | "released"
  | "printing"
  | "printed"
  | "payment_failed"
  | "print_failed"
  | "refunded";

export interface PrintOptions {
  copies: number;
  color: boolean;
  orientation: "portrait" | "landscape";
  paper: string;
  duplex: boolean;
  duplex_edge: "long" | "short";
  pageRange: string | null;
  numberUp: number;
  collate: boolean;
  quality: "draft" | "normal" | "high";
  mediaType: string;
  reverse: boolean;
  scaling: "none" | "fit-to-page" | "shrink-to-fit";
  finishings: string[];
}

export interface PriceBreakdown {
  selected_pages: number;
  number_up: number;
  sides: number;
  copies: number;
  per_side_base: number;
  a3_applied: boolean;
  media_type_surcharge: number;
  duplex_factor_applied: number;
  subtotal: number;
  min_charge_applied: boolean;
  price_paise: number;
}

export interface Shop {
  id: string;
  name: string;
  location: string | null;
  status: string;
}

export interface Pricing {
  bw_page_paise: number;
  color_page_paise: number;
  a3_multiplier: number;
  duplex_factor: number;
  min_charge_paise: number;
  media_type_surcharges: Record<string, number>;
}

export interface PrinterCapabilities {
  color: boolean;
  sides: string[];
  media: string[];
  number_up: number[];
  quality: string[];
  media_types: string[];
  finishings: string[];
  collate: boolean;
  reverse: boolean;
  scaling: string[];
  max_copies: number;
}

// Sensible default capability set for shops that don't have a registered
// printer yet — used by virtual/demo shops and as a fallback so the print
// UI always has something to render.
export const DEFAULT_CAPABILITIES: PrinterCapabilities = {
  color: true,
  sides: ["one-sided", "two-sided-long-edge", "two-sided-short-edge"],
  media: ["A4", "A3", "Letter"],
  number_up: [1, 2, 4],
  quality: ["draft", "normal", "high"],
  media_types: ["plain"],
  finishings: [],
  collate: true,
  reverse: false,
  scaling: ["none", "fit-to-page", "shrink-to-fit"],
  max_copies: 99,
};

export type CapabilitiesSource = "default" | "discovered" | "manual";

export interface PrinterInfo {
  capabilities: PrinterCapabilities;
  capabilities_source: CapabilitiesSource;
  make_and_model: string | null;
  capabilities_updated_at: string | null;
}

export interface PrintJob {
  id: string;
  shop_id: string;
  file_path: string;
  file_mime: string | null;
  pages: number;
  copies: number;
  color: boolean;
  orientation: string;
  paper: string;
  duplex: boolean;
  duplex_edge: string;
  page_range: string | null;
  number_up: number;
  collate: boolean;
  quality: string;
  media_type: string;
  reverse: boolean;
  scaling: string;
  finishings: string[];
  sides_billed: number | null;
  price_paise: number;
  status: JobStatus;
  release_code: string | null;
  razorpay_order_id: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}
