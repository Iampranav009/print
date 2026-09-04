// POST /api/vendor/claim  { token }  — bind the signed-in user to the shop
// referenced by an unclaimed, unexpired invite token. Idempotent: if the
// user is already the shop's owner, returns success.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

interface Body {
  token: string;
}

export async function POST(req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = (await req.json()) as Body;
  if (!token?.trim()) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: invite } = await supabase
    .from("vendor_invites")
    .select("token, shop_id, claimed_by, expires_at, email")
    .eq("token", token.trim())
    .maybeSingle();

  if (!invite) {
    return Response.json({ error: "Invite not found" }, { status: 404 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return Response.json({ error: "Invite has expired" }, { status: 410 });
  }
  if (invite.claimed_by && invite.claimed_by !== user.id) {
    return Response.json({ error: "Invite already claimed" }, { status: 409 });
  }
  if (invite.email && invite.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return Response.json(
      { error: `This invite is for ${invite.email}. Sign in with that Google account.` },
      { status: 403 }
    );
  }

  // Reject if this user already owns a different shop.
  const { data: existing } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .neq("id", invite.shop_id)
    .maybeSingle();
  if (existing) {
    return Response.json(
      { error: "This account already owns another shop" },
      { status: 409 }
    );
  }

  const { error: shopErr } = await supabase
    .from("shops")
    .update({ owner_id: user.id })
    .eq("id", invite.shop_id);
  if (shopErr) return Response.json({ error: shopErr.message }, { status: 500 });

  await supabase
    .from("vendor_invites")
    .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
    .eq("token", token.trim());

  return Response.json({ shopId: invite.shop_id });
}
