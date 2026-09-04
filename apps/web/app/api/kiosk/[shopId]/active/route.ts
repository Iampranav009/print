// GET /api/kiosk/[shopId]/active — returns the newest non-terminal print
// job for a shop, plus the last few completed jobs for the activity strip.
// The kiosk page hits this on mount, then uses Supabase Realtime to keep
// itself fresh without polling. Public route — no auth required.

import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

const NON_TERMINAL = [
  "priced",
  "awaiting_payment",
  "paid",
  "dispatched",
  "printing",
  "awaiting_release",
] as const;

const RECENT_TERMINAL = [
  "released",
  "printed",
  "payment_failed",
  "print_failed",
  "refunded",
] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = getSupabase();

  const [{ data: active }, { data: recent }] = await Promise.all([
    supabase
      .from("print_jobs")
      .select(
        "id, status, release_code, file_path, pages, copies, color, price_paise, created_at, updated_at"
      )
      .eq("shop_id", shopId)
      .in("status", NON_TERMINAL as unknown as string[])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("print_jobs")
      .select("id, status, file_path, updated_at")
      .eq("shop_id", shopId)
      .in("status", RECENT_TERMINAL as unknown as string[])
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  const shapeJob = (
    j: {
      id: string;
      status: string;
      release_code?: string | null;
      file_path?: string | null;
      pages?: number;
      copies?: number;
      color?: boolean;
      price_paise?: number;
      created_at?: string;
      updated_at?: string;
    } | null
  ) =>
    j
      ? {
          id: j.id,
          status: j.status,
          release_code: j.release_code ?? null,
          file_name: j.file_path?.split("/").pop() ?? "document",
          pages: j.pages,
          copies: j.copies,
          color: j.color,
          price_paise: j.price_paise,
          created_at: j.created_at,
          updated_at: j.updated_at,
        }
      : null;

  return Response.json({
    active: shapeJob(active),
    recent: (recent ?? []).map((r) => shapeJob(r)),
  });
}
