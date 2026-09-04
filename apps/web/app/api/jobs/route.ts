import { getSupabase } from "@/lib/supabase";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getRazorpay } from "@/lib/razorpay";
import { computePrice, parsePageRange } from "@/lib/pricing";
import type { PrintOptions, Pricing, PrinterCapabilities } from "@printbuddy/shared";
import { PDFDocument } from "pdf-lib";
import { NextRequest } from "next/server";

const VIRTUAL_SHOP_ID = "00000000-0000-0000-0000-000000000001";

// Client sends { range, number_up } — normalise to the canonical names.
function normalizeOptions(raw: Record<string, unknown>): Partial<PrintOptions> {
  return {
    copies: raw.copies as number | undefined,
    color: raw.color as boolean | undefined,
    orientation: raw.orientation as PrintOptions["orientation"] | undefined,
    paper: raw.paper as string | undefined,
    duplex: raw.duplex as boolean | undefined,
    duplex_edge: raw.duplex_edge as PrintOptions["duplex_edge"] | undefined,
    pageRange: (raw.pageRange as string | null | undefined) ?? (raw.range as string | null | undefined) ?? null,
    numberUp: (raw.numberUp as number | undefined) ?? (raw.number_up as number | undefined),
    collate: raw.collate as boolean | undefined,
    quality: raw.quality as PrintOptions["quality"] | undefined,
    mediaType: (raw.mediaType as string | undefined) ?? (raw.media_type as string | undefined),
    reverse: raw.reverse as boolean | undefined,
    scaling: raw.scaling as PrintOptions["scaling"] | undefined,
    finishings: raw.finishings as string[] | undefined,
  };
}

function inferMime(path: string | undefined | null): string {
  const ext = path?.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "application/pdf";
}

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
  const rawShopId = body.shopId as string | undefined;
  const filePath = body.filePath as string | undefined;
  const rawFileMime = body.fileMime as string | undefined;
  const rawOptions = (body.options ?? {}) as Record<string, unknown>;
  const withOrder = body.withOrder !== false; // default true — client wants a
                                              // Razorpay order in the same call

  if (!filePath || !rawOptions) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // "virtual" is a shorthand the client uses when the user isn't yet bound
  // to a real shop — route it to the pilot/demo shop.
  const shopId = !rawShopId || rawShopId === "virtual" ? VIRTUAL_SHOP_ID : rawShopId;

  const options = normalizeOptions(rawOptions);

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

  const safeOptionsForValidation: PrintOptions = {
    copies: options.copies || 1,
    color: options.color ?? false,
    orientation: options.orientation || "portrait",
    paper: options.paper || "A4",
    duplex: options.duplex ?? false,
    duplex_edge: options.duplex_edge || "long",
    pageRange: options.pageRange ?? null,
    numberUp: options.numberUp || 1,
    collate: options.collate ?? true,
    quality: options.quality || "normal",
    mediaType: options.mediaType || "plain",
    reverse: options.reverse ?? false,
    scaling: options.scaling || "none",
    finishings: options.finishings || [],
  };

  if (printer?.capabilities) {
    const capError = validateAgainstCapabilities(
      safeOptionsForValidation,
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
  const mime = rawFileMime || inferMime(filePath);

  if (mime === "application/pdf") {
    const arrayBuf = await fileData.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuf, { ignoreEncryption: true });
    totalPages = pdf.getPageCount();
  } else {
    totalPages = 1;
  }

  const safeOptions = safeOptionsForValidation;

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

  // Optionally mint the Razorpay order in the same call. The mobile client
  // does this to avoid a second round-trip before opening checkout.
  let orderResult: {
    orderId: string;
    keyId: string | undefined;
    amount: number;
    currency: string;
  } | null = null;

  if (withOrder) {
    try {
      const razorpay = getRazorpay();
      const order = await razorpay.orders.create({
        amount: breakdown.price_paise,
        currency: "INR",
        receipt: job.id,
        notes: { job_id: job.id },
      });

      await supabase
        .from("print_jobs")
        .update({
          razorpay_order_id: order.id,
          status: "awaiting_payment",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await supabase.from("payments").insert({
        print_job_id: job.id,
        razorpay_order_id: order.id,
        amount_paise: breakdown.price_paise,
        status: "pending",
      });

      orderResult = {
        orderId: order.id,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: breakdown.price_paise,
        currency: "INR",
      };
    } catch (err) {
      console.error("[jobs] order create failed", err);
      // Job was still created — client can retry via /api/jobs/:id/pay
    }
  }

  return Response.json({
    jobId: job.id,
    pages: breakdown.selected_pages,
    totalPages,
    pricePaise: breakdown.price_paise,
    breakdown,
    releaseCode,
    ...(orderResult ?? {}),
  });
}
