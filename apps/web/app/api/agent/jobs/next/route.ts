import { getSupabase } from "@/lib/supabase";
import { resolveAgentToken } from "@/lib/agent-auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const agent = await resolveAgentToken(req.headers.get("authorization"));
  if (!agent) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const [{ data: job }, { data: announcements }] = await Promise.all([
    supabase
      .from("print_jobs")
      .select(
        "id, file_path, file_mime, pages, copies, color, orientation, paper, duplex, duplex_edge, page_range, number_up, collate, quality, media_type, reverse, scaling, finishings, sides_billed, status, release_code, debug_fail_reason, price_paise"
      )
      .eq("shop_id", agent.shopId)
      .in("status", ["dispatched", "released", "awaiting_release"])
      .order("created_at", { ascending: true })
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
  ]);

  if (!job) {
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
      pageRange: job.page_range,
      numberUp: job.number_up,
      collate: job.collate,
      quality: job.quality,
      mediaType: job.media_type,
      reverse: job.reverse,
      scaling: job.scaling,
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
