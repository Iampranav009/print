import { getSupabase } from "@/lib/supabase";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { computePrice, parsePageRange } from "@/lib/pricing";
import type { PrintOptions, Pricing, PrinterCapabilities } from "@printbuddy/shared";
import { PDFDocument } from "pdf-lib";
import { NextRequest } from "next/server";

function generateReleaseCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function deriveSides(duplex: boolean, duplex_edge: "long" | "short"): string {
  if (!duplex) return "one-sided";
  return duplex_edge === "short" ? "two-sided-short-edge" : "two-sided-long-edge";
}

function validateAgainstCapabilities(
  options: PrintOptions,
  caps: PrinterCapabilities
): string | null {
  if (options.color && !caps.color) {
    return "This printer does not support color printing.";
  }
  if (!caps.media.includes(options.paper)) {
    return `Paper size "${options.paper}" is not supported. Available: ${caps.media.join(", ")}`;
  }
  const sidesValue = deriveSides(options.duplex, options.duplex_edge);
  if (!caps.sides.includes(sidesValue)) {
    return `Sides mode "${sidesValue}" is not supported. Available: ${caps.sides.join(", ")}`;
  }
  if (!caps.number_up.includes(options.numberUp || 1)) {
    return `${options.numberUp}-up is not supported. Available: ${caps.number_up.join(", ")}`;
  }
  if (!caps.quality.includes(options.quality || "normal")) {
    return `Quality "${options.quality}" is not supported. Available: ${caps.quality.join(", ")}`;
  }
  if (
    options.mediaType &&
    options.mediaType !== "plain" &&
    !caps.media_types.includes(options.mediaType)
  ) {
    return `Media type "${options.mediaType}" is not supported. Available: ${caps.media_types.join(", ")}`;
  }
  if (options.reverse && !caps.reverse) {
    return "Reverse order printing is not supported by this printer.";
  }
  if (
    options.scaling &&
    options.scaling !== "none" &&
    !caps.scaling.includes(options.scaling)
  ) {
    return `Scaling "${options.scaling}" is not supported. Available: ${caps.scaling.join(", ")}`;
  }
  if (options.copies > (caps.max_copies || 99)) {
    return `Maximum copies is ${caps.max_copies}. You requested ${options.copies}.`;
  }
  for (const f of options.finishings || []) {
    if (!caps.finishings.includes(f)) {
      return `Finishing "${f}" is not supported. Available: ${caps.finishings.join(", ")}`;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shopId, filePath, fileMime, options } = body as {
    shopId: string;
    filePath: string;
    fileMime: string;
    options: PrintOptions;
  };

  if (!shopId || !filePath || !options) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Read the signed-in user (if any) so we can attach user_id to the job for
  // the History tab. Anonymous walk-up jobs are still allowed for back-compat.
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  const userId = user?.id ?? null;

  const supabase = getSupabase();

  const { data: pricing, error: pricingErr } = await supabase
    .from("pricing")
    .select(
      "bw_page_paise, color_page_paise, a3_multiplier, duplex_factor, min_charge_paise, media_type_surcharges"
    )
    .eq("shop_id", shopId)
    .single();

  if (pricingErr || !pricing) {
    return Response.json({ error: "Shop pricing not found" }, { status: 404 });
  }

  const { data: printer } = await supabase
    .from("printers")
    .select("capabilities")
    .eq("shop_id", shopId)
    .limit(1)
    .single();

  if (printer?.capabilities) {
    const capError = validateAgainstCapabilities(
      options,
      printer.capabilities as PrinterCapabilities
    );
    if (capError) {
      return Response.json({ error: capError }, { status: 422 });
    }
  }

  const { data: fileData, error: fileErr } = await supabase.storage
    .from("documents")
    .download(filePath);

  if (fileErr || !fileData) {
    return Response.json({ error: "File not found in storage" }, { status: 404 });
  }

  let totalPages: number;
  const mime = fileMime || "application/pdf";

  if (mime === "application/pdf") {
    const arrayBuf = await fileData.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuf);
    totalPages = pdf.getPageCount();
  } else {
    totalPages = 1;
  }

  const safeOptions: PrintOptions = {
    copies: options.copies || 1,
    color: options.color ?? false,
    orientation: options.orientation || "portrait",
    paper: options.paper || "A4",
    duplex: options.duplex ?? false,
    duplex_edge: options.duplex_edge || "long",
    pageRange: options.pageRange || null,
    numberUp: options.numberUp || 1,
    collate: options.collate ?? true,
    quality: options.quality || "normal",
    mediaType: options.mediaType || "plain",
    reverse: options.reverse ?? false,
    scaling: options.scaling || "none",
    finishings: options.finishings || [],
  };

  const breakdown = computePrice(pricing as Pricing, safeOptions, totalPages);
  const releaseCode = generateReleaseCode();

  const { data: job, error: jobErr } = await supabase
    .from("print_jobs")
    .insert({
      shop_id: shopId,
      user_id: userId,
      file_path: filePath,
      file_mime: mime,
      pages: breakdown.selected_pages,
      copies: safeOptions.copies,
      color: safeOptions.color,
      orientation: safeOptions.orientation,
      paper: safeOptions.paper,
      duplex: safeOptions.duplex,
      duplex_edge: safeOptions.duplex_edge,
      page_range: safeOptions.pageRange,
      number_up: safeOptions.numberUp,
      collate: safeOptions.collate,
      quality: safeOptions.quality,
      media_type: safeOptions.mediaType,
      reverse: safeOptions.reverse,
      scaling: safeOptions.scaling,
      finishings: safeOptions.finishings,
      sides_billed: breakdown.sides,
      price_paise: breakdown.price_paise,
      status: "priced",
      release_code: releaseCode,
    })
    .select("id")
    .single();

  if (jobErr || !job) {
    return Response.json({ error: "Failed to create job", detail: jobErr?.message, code: jobErr?.code }, { status: 500 });
  }

  return Response.json({
    jobId: job.id,
    pages: breakdown.selected_pages,
    totalPages,
    pricePaise: breakdown.price_paise,
    breakdown,
    releaseCode,
  });
}
