// PUT /api/vendor/bank — upsert the vendor's bank details for payouts.
// Sensitive fields; RLS on the table restricts reads to the shop owner +
// service role. The `verified` flag is admin-controlled — vendors can't
// set it on themselves.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

interface Body {
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name?: string;
  branch?: string;
  upi_id?: string;
}

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export async function PUT(req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;

  if (!body.account_holder_name?.trim() || !body.account_number?.trim() || !body.ifsc_code?.trim()) {
    return Response.json(
      { error: "account_holder_name, account_number, and ifsc_code are required" },
      { status: 400 }
    );
  }
  const ifsc = body.ifsc_code.trim().toUpperCase();
  if (!IFSC_REGEX.test(ifsc)) {
    return Response.json({ error: "IFSC code format is invalid" }, { status: 400 });
  }
  const acct = body.account_number.replace(/\s+/g, "");
  if (!/^\d{6,20}$/.test(acct)) {
    return Response.json({ error: "Account number must be 6-20 digits" }, { status: 400 });
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
        account_holder_name: body.account_holder_name.trim(),
        account_number: acct,
        ifsc_code: ifsc,
        bank_name: body.bank_name?.trim() ?? null,
        branch: body.branch?.trim() ?? null,
        upi_id: body.upi_id?.trim() ?? null,
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
