import { getSupabase } from "@/lib/supabase";
import { resolveAgentToken } from "@/lib/agent-auth";
import { NextRequest } from "next/server";
import { printerForJob } from "@/lib/printer-routing";

export async function GET(req: NextRequest) {
  const agent = await resolveAgentToken(req.headers.get("authorization"));
  if (!agent) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  // A physical printer has one active slot. Other paid jobs remain durable
  // in the database and become eligible when this job finishes.
  const { data: printing, error: printingError } = await supabase
    .from("print_jobs")
    .select("id")
    .eq("shop_id", agent.shopId)
    .eq("status", "printing")
    .limit(1)
    .maybeSingle();
  if (printingError) return Response.json({ error: "Queue unavailable" }, { status: 503 });

  const [{ data: job }, { data: announcements }, { data: printer, error: printerError }] = await Promise.all([
    supabase
      .from("print_jobs")
      .select(
        "id, file_path, file_mime, pages, copies, color, orientation, paper, duplex, duplex_edge, page_range, number_up, collate, quality, media_type, reverse, scaling, finishings, sides_billed, status, release_code, debug_fail_reason, price_paise"
      )
      .eq("shop_id", agent.shopId)
      .in("status", ["dispatched", "released", "awaiting_release"])
      .order("updated_at", { ascending: true })
      .limit(1)
      .maybeSingle(),

    // Pending payment-failed announcements for this shop (last 2 hours, unacked).
    supabase
      .from("print_jobs")
      .select("id, price_paise")
      .eq("shop_id", agent.shopId)
      .eq("status", "payment_failed")
      .is("sound_ack_at", null)
      .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .limit(20),
    supabase.from("printers").select("os_printer_name, bw_os_printer_name, color_os_printer_name")
      .eq("shop_id", agent.shopId).order("id").limit(1).maybeSingle(),
  ]);
  if (printerError) return Response.json({ error: "Printer routing unavailable" }, { status: 503 });

  if (printing || !job) {
    return Response.json({
      job: null,
      announcements: (announcements ?? []).map((a) => ({
        id: a.id,
        kind: "payment_failed" as const,
        amount_paise: a.price_paise ?? 0,
      })),
    });
  }

  const { data: signedUrl } = await supabase.storage
    .from("documents")
    .createSignedUrl(job.file_path, 300);

  return Response.json({
    job: {
      id: job.id,
      osPrinterName: printerForJob(printer, job.color),
      status: job.status,
      downloadUrl: signedUrl?.signedUrl || null,
      fileMime: job.file_mime,
      pages: job.pages,
      copies: job.copies,
      color: job.color,
      orientation: job.orientation,
      paper: job.paper,
      duplex: job.duplex,
      duplexEdge: job.duplex_edge,
      pageRange: job.file_path.endsWith(".layout.pdf") ? null : job.page_range,
      numberUp: job.file_path.endsWith(".layout.pdf") ? 1 : job.number_up,
      collate: job.collate,
      quality: job.quality,
      mediaType: job.media_type,
      reverse: job.file_path.endsWith(".layout.pdf") ? false : job.reverse,
      scaling: job.file_path.endsWith(".layout.pdf") ? "none" : job.scaling,
      finishings: job.finishings,
      sidesBilled: job.sides_billed,
      releaseCode: job.release_code,
      pricePaise: job.price_paise ?? 0,
      ...(job.debug_fail_reason ? { simulateFail: job.debug_fail_reason } : {}),
    },
    announcements: (announcements ?? []).map((a) => ({
      id: a.id,
      kind: "payment_failed" as const,
      amount_paise: a.price_paise ?? 0,
    })),
  });
}
