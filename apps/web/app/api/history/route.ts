// GET /api/history — returns the signed-in user's past print jobs, newest
// first, joined with the shop name. Used by the History tab on the mobile
// app. Requires auth; the middleware-guarded /app pages call this so an
// anon request here should be rare, but we 401 anyway for safety.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(_req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service-role client so we can select across the shop join without
  // needing an RLS policy on shops.
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("print_jobs")
    .select(
      `id, shop_id, status, price_paise, pages, copies, color, paper,
       duplex, orientation, release_code, failure_reason, file_path,
       file_mime, created_at, updated_at,
       shops:shop_id ( name, location )`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const jobs = (data ?? []).map((row) => {
    const shop = Array.isArray(row.shops) ? row.shops[0] : row.shops;
    const filename = row.file_path?.split("/").pop() ?? "document";
    return {
      id: row.id,
      shop_id: row.shop_id,
      shop_name: shop?.name ?? "Unknown shop",
      shop_location: shop?.location ?? null,
      status: row.status,
      price_paise: row.price_paise,
      pages: row.pages,
      copies: row.copies,
      color: row.color,
      paper: row.paper,
      duplex: row.duplex,
      orientation: row.orientation,
      release_code: row.release_code,
      failure_reason: row.failure_reason,
      file_name: filename,
      file_mime: row.file_mime,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  return Response.json({ jobs });
}
