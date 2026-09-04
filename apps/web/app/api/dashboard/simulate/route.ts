import { getSupabase } from "@/lib/supabase";
import { PDFDocument } from "pdf-lib";
import { computePrice, parsePageRange } from "@/lib/pricing";
import type { PrintOptions, Pricing } from "@printbuddy/shared";
import { NextRequest } from "next/server";
import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";

function isTestMode(): boolean {
  return RAZORPAY_KEY_ID.startsWith("rzp_test_");
}

function makeMinimalPdf(): Uint8Array {
  const pdf = `%PDF-1.0
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
206
%%EOF`;
  return new TextEncoder().encode(pdf);
}

export async function POST(req: NextRequest) {
  if (!isTestMode()) {
    return Response.json(
      { error: "Simulate endpoints are only available in Razorpay test mode" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { action, shopId, jobId, status, reason } = body as {
    action: string;
    shopId?: string;
    jobId?: string;
    status?: string;
    reason?: string;
  };

  const supabase = getSupabase();

  if (action === "create_test_job") {
    const sid = shopId || "00000000-0000-0000-0000-000000000001";

    const filePath = `${sid}/${crypto.randomUUID()}.pdf`;
    const pdfBuf = makeMinimalPdf();

    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(filePath, pdfBuf, { contentType: "application/pdf", upsert: true });

    if (upErr) {
      return Response.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
    }

    const { data: pricing, error: pricingErr } = await supabase
      .from("pricing")
      .select(
        "bw_page_paise, color_page_paise, a3_multiplier, duplex_factor, min_charge_paise, media_type_surcharges"
      )
      .eq("shop_id", sid)
      .single();

    if (pricingErr || !pricing) {
      return Response.json({ error: "Pricing not found" }, { status: 404 });
    }

    const options: PrintOptions = {
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

    const breakdown = computePrice(pricing as Pricing, options, 1);
    const releaseCode = String(Math.floor(1000 + Math.random() * 9000));

    const { data: job, error: jobErr } = await supabase
      .from("print_jobs")
      .insert({
        shop_id: sid,
        file_path: filePath,
        file_mime: "application/pdf",
        pages: 1,
        copies: 1,
        color: false,
        orientation: "portrait",
        paper: "A4",
        duplex: false,
        duplex_edge: "long",
        page_range: null,
        number_up: 1,
        collate: true,
        quality: "normal",
        media_type: "plain",
        reverse: false,
        scaling: "none",
        finishings: [],
        sides_billed: breakdown.sides,
        price_paise: breakdown.price_paise,
        status: "priced",
        release_code: releaseCode,
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      return Response.json({ error: "Failed to create job" }, { status: 500 });
    }

    return Response.json({
      jobId: job.id,
      pricePaise: breakdown.price_paise,
      releaseCode,
    });
  }

  if (action === "simulate_dispatch") {
    if (!jobId) {
      return Response.json({ error: "jobId required" }, { status: 400 });
    }

    await supabase
      .from("print_jobs")
      .update({ status: "dispatched", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return Response.json({ ok: true });
  }

  if (action === "advance_status") {
    if (!jobId || !status) {
      return Response.json({ error: "jobId and status required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (reason) updateData.failure_reason = reason;

    await supabase.from("print_jobs").update(updateData).eq("id", jobId);

    return Response.json({ ok: true });
  }

  if (action === "set_debug_fail") {
    if (!jobId) {
      return Response.json({ error: "jobId required" }, { status: 400 });
    }
    await supabase
      .from("print_jobs")
      .update({ debug_fail_reason: reason || null, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    return Response.json({ ok: true });
  }

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
