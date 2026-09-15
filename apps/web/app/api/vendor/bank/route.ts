// PUT /api/vendor/bank — upsert the vendor's bank details for payouts.
// Sensitive fields; RLS on the table restricts reads to the shop owner +
// service role. The `verified` flag is admin-controlled — vendors can't
// set it on themselves.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

import { validatePayoutDetails } from "@/lib/payout-details";

export async function PUT(req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const parsed = validatePayoutDetails(body);
  if (typeof parsed === "string") {
    return Response.json({ error: parsed }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!shop) {
    return Response.json({ error: "No shop assigned to this account" }, { status: 404 });
  }

  // Save; changing details resets verification.
  const { data, error } = await supabase
    .from("vendor_bank_details")
    .upsert(
      {
        shop_id: shop.id,
        ...parsed,
        verified: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_id" }
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ bank: data });
}
