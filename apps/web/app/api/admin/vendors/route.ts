// GET /api/admin/vendors — list every vendor (owner) with their shop, contact,
// and lifetime revenue snapshot. Vendors without a claimed shop are omitted;
// use /api/admin/invites for the invite-pipeline view.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

const PAID_STATUSES = [
  "paid",
  "dispatched",
  "printing",
  "awaiting_release",
  "released",
  "printed",
];

async function requireAdmin() {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return { user: null, error: "Unauthorized" as const, status: 401 };
  if (!isAdmin(user)) return { user, error: "Forbidden" as const, status: 403 };
  return { user, error: null, status: 200 };
}

export async function GET(_req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const supabase = getSupabase();

  const { data: shops, error: shopsErr } = await supabase
    .from("shops")
    .select("id, name, location, status, virtual_mode, owner_id, contact_email, contact_phone, created_at")
    .not("owner_id", "is", null)
    .order("created_at", { ascending: false });
  if (shopsErr) return Response.json({ error: shopsErr.message }, { status: 500 });

  const ownerIds = Array.from(new Set((shops ?? []).map((s) => s.owner_id as string)));
  const shopIds = (shops ?? []).map((s) => s.id as string);

  const [{ data: profiles }, { data: banks }, { data: jobs }] = await Promise.all([
    ownerIds.length
      ? supabase.from("vendor_profiles").select("user_id, full_name, phone, address").in("user_id", ownerIds)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
    shopIds.length
      ? supabase.from("vendor_bank_details").select("shop_id, verified, bank_name").in("shop_id", shopIds)
      : Promise.resolve({ data: [] as { shop_id: string; verified: boolean; bank_name: string | null }[] }),
    shopIds.length
      ? supabase
          .from("print_jobs")
          .select("shop_id, price_paise, pages, copies")
          .in("shop_id", shopIds)
          .in("status", PAID_STATUSES)
      : Promise.resolve({ data: [] as { shop_id: string; price_paise: number; pages: number; copies: number }[] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const bankMap = new Map((banks ?? []).map((b) => [b.shop_id, b]));

  const jobStats = new Map<string, { revenue_paise: number; prints: number }>();
  for (const j of jobs ?? []) {
    const s = jobStats.get(j.shop_id) ?? { revenue_paise: 0, prints: 0 };
    s.revenue_paise += j.price_paise;
    s.prints += j.pages * j.copies;
    jobStats.set(j.shop_id, s);
  }

  const vendors = (shops ?? []).map((s) => {
    const profile = profileMap.get(s.owner_id as string) ?? null;
    const bank = bankMap.get(s.id as string) ?? null;
    const stats = jobStats.get(s.id as string) ?? { revenue_paise: 0, prints: 0 };
    return {
      shop_id: s.id,
      shop_name: s.name,
      location: s.location,
      status: s.status,
      virtual_mode: s.virtual_mode,
      owner_id: s.owner_id,
      contact_email: s.contact_email,
      contact_phone: s.contact_phone,
      created_at: s.created_at,
      profile,
      bank_verified: bank?.verified ?? false,
      bank_name: bank?.bank_name ?? null,
      has_bank: !!bank,
      lifetime_revenue_paise: stats.revenue_paise,
      lifetime_prints: stats.prints,
    };
  });

  return Response.json({ vendors });
}
