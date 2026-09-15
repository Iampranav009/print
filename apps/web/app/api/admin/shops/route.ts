// Admin: list all shops with owner info, and create new shops.
// Gated by the ADMIN_EMAILS allowlist.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

async function requireAdmin() {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return { user: null, error: "Unauthorized" as const, status: 401 };
  if (!isAdmin(user)) return { user, error: "Forbidden" as const, status: 403 };
  return { user, error: null, status: 200 };
}

const PAID_STATUSES = [
  "paid",
  "dispatched",
  "printing",
  "awaiting_release",
  "released",
  "printed",
];

export async function GET(_req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const supabase = getSupabase();
  const { data: shops, error } = await supabase
    .from("shops")
    .select(
      "id, name, location, status, virtual_mode, owner_id, commission_rate, owner_phone, contact_email, contact_phone, latitude, longitude, google_place_id, created_at"
    )
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const shopIds = (shops ?? []).map((s) => s.id as string);
  const ownerIds = Array.from(
    new Set((shops ?? []).map((s) => s.owner_id).filter(Boolean) as string[])
  );

  const [
    { data: profiles },
    { data: pricingList },
    { data: printersList },
    { data: agentsList },
    { data: bankList },
    { data: invitesList },
    { data: jobsList },
  ] = await Promise.all([
    ownerIds.length
      ? supabase.from("vendor_profiles").select("user_id, full_name, phone, address").in("user_id", ownerIds)
      : Promise.resolve({ data: [] as { user_id: string; full_name: string; phone: string; address: string | null }[] }),
    shopIds.length
      ? supabase.from("pricing").select("shop_id, bw_page_paise, color_page_paise, a3_multiplier, duplex_factor, min_charge_paise").in("shop_id", shopIds)
      : Promise.resolve({ data: [] }),
    shopIds.length
      ? supabase.from("printers").select("id, shop_id, os_printer_name, status, online, last_seen_at, supports_color, supports_duplex, make_and_model").in("shop_id", shopIds)
      : Promise.resolve({ data: [] }),
    shopIds.length
      ? supabase.from("agents").select("id, shop_id, platform, status, last_heartbeat").in("shop_id", shopIds)
      : Promise.resolve({ data: [] }),
    shopIds.length
      ? supabase.from("vendor_bank_details").select("shop_id, bank_name, account_holder_name, account_number, ifsc, verified").in("shop_id", shopIds)
      : Promise.resolve({ data: [] }),
    shopIds.length
      ? supabase.from("vendor_invites").select("shop_id, email, token, expires_at, created_at, claimed_at").in("shop_id", shopIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    shopIds.length
      ? supabase.from("print_jobs").select("shop_id, price_paise, pages, copies, status").in("shop_id", shopIds).in("status", PAID_STATUSES)
      : Promise.resolve({ data: [] }),
  ]);

  // Query auth.admin.listUsers() to get email & metadata for owners
  const authUserMap = new Map<string, { email?: string; phone?: string; user_metadata?: Record<string, any> }>();
  try {
    const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersData?.users) {
      for (const u of usersData.users) {
        authUserMap.set(u.id, { email: u.email, phone: u.phone, user_metadata: u.user_metadata });
      }
    }
  } catch (err) {
    console.error("Failed to list auth users in admin shops API:", err);
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const pricingMap = new Map((pricingList ?? []).map((p) => [p.shop_id, p]));
  const bankMap = new Map((bankList ?? []).map((b) => [b.shop_id, b]));

  const printerMap = new Map<string, any[]>();
  for (const p of printersList ?? []) {
    const list = printerMap.get(p.shop_id) ?? [];
    list.push(p);
    printerMap.set(p.shop_id, list);
  }

  const agentMap = new Map((agentsList ?? []).map((a) => [a.shop_id, a]));

  const inviteMap = new Map<string, any[]>();
  for (const inv of invitesList ?? []) {
    const list = inviteMap.get(inv.shop_id) ?? [];
    list.push(inv);
    inviteMap.set(inv.shop_id, list);
  }

  const statsMap = new Map<string, { revenue_paise: number; prints: number; jobs_count: number }>();
  for (const j of jobsList ?? []) {
    const s = statsMap.get(j.shop_id) ?? { revenue_paise: 0, prints: 0, jobs_count: 0 };
    s.revenue_paise += j.price_paise ?? 0;
    s.prints += (j.pages ?? 1) * (j.copies ?? 1);
    s.jobs_count += 1;
    statsMap.set(j.shop_id, s);
  }

  const enrichedShops = (shops ?? []).map((s) => {
    const profile = s.owner_id ? profileMap.get(s.owner_id) : null;
    const authUser = s.owner_id ? authUserMap.get(s.owner_id) : null;
    const shopInvites = inviteMap.get(s.id) ?? [];
    const latestInvite = shopInvites[0] ?? null;

    // Resolve owner email: auth user email -> contact_email -> pending invite email
    const ownerEmail = authUser?.email ?? s.contact_email ?? latestInvite?.email ?? null;
    const ownerPhone = profile?.phone ?? s.contact_phone ?? s.owner_phone ?? authUser?.phone ?? null;
    const ownerName = profile?.full_name ?? authUser?.user_metadata?.full_name ?? null;

    return {
      ...s,
      owner_email: ownerEmail,
      owner_phone: ownerPhone,
      owner_name: ownerName,
      owner_address: profile?.address ?? null,
      is_claimed: !!s.owner_id,
      owner: s.owner_id
        ? {
            id: s.owner_id,
            email: authUser?.email ?? s.contact_email ?? null,
            name: ownerName,
            phone: ownerPhone,
            address: profile?.address ?? null,
          }
        : null,
      invite: latestInvite
        ? {
            email: latestInvite.email,
            token: latestInvite.token,
            expires_at: latestInvite.expires_at,
            claimed_at: latestInvite.claimed_at,
          }
        : null,
      pricing: pricingMap.get(s.id) ?? null,
      printers: printerMap.get(s.id) ?? [],
      agent: agentMap.get(s.id) ?? null,
      bank: bankMap.get(s.id) ?? null,
      stats: statsMap.get(s.id) ?? { revenue_paise: 0, prints: 0, jobs_count: 0 },
    };
  });

  return Response.json({ shops: enrichedShops });
}

interface CreateBody {
  name: string;
  location?: string;
  virtual_mode?: boolean;
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as CreateBody;
  if (!body.name?.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: shop, error } = await supabase
    .from("shops")
    .insert({
      name: body.name.trim(),
      location: body.location?.trim() ?? null,
      virtual_mode: body.virtual_mode ?? false,
      status: "active",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Seed default pricing so the shop is immediately usable.
  await supabase.from("pricing").insert({ shop_id: shop.id }).select();

  return Response.json({ shop });
}
