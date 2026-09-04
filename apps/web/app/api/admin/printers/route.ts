// GET /api/admin/printers — every shop (printer) with its coordinates so
// admins can see them on a map. Includes agent-online status + lifetime prints
// so a marker can carry a quick summary.

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

  const { data: shops, error } = await supabase
    .from("shops")
    .select("id, name, location, latitude, longitude, status, virtual_mode, owner_id, created_at")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const shopIds = (shops ?? []).map((s) => s.id as string);

  const [{ data: agents }, { data: jobs }] = await Promise.all([
    shopIds.length
      ? supabase.from("agents").select("shop_id, status, last_heartbeat, platform").in("shop_id", shopIds)
      : Promise.resolve({ data: [] as { shop_id: string; status: string; last_heartbeat: string | null; platform: string | null }[] }),
    shopIds.length
      ? supabase
          .from("print_jobs")
          .select("shop_id, price_paise, pages, copies, color")
          .in("shop_id", shopIds)
          .in("status", PAID_STATUSES)
      : Promise.resolve({ data: [] as { shop_id: string; price_paise: number; pages: number; copies: number; color: boolean }[] }),
  ]);

  const agentMap = new Map<string, { online: boolean; platform: string | null; last_heartbeat: string | null }>();
  for (const a of agents ?? []) {
    const online =
      a.status === "online" &&
      !!a.last_heartbeat &&
      Date.now() - new Date(a.last_heartbeat).getTime() < 60_000;
    const prev = agentMap.get(a.shop_id);
    // If any of this shop's agents is online, mark it online.
    if (!prev || online) {
      agentMap.set(a.shop_id, { online, platform: a.platform, last_heartbeat: a.last_heartbeat });
    }
  }

  const jobStats = new Map<string, { prints: number; color_prints: number; bw_prints: number; revenue_paise: number }>();
  for (const j of jobs ?? []) {
    const s = jobStats.get(j.shop_id) ?? { prints: 0, color_prints: 0, bw_prints: 0, revenue_paise: 0 };
    const sheets = j.pages * j.copies;
    s.prints += sheets;
    s.revenue_paise += j.price_paise;
    if (j.color) s.color_prints += sheets;
    else s.bw_prints += sheets;
    jobStats.set(j.shop_id, s);
  }

  const printers = (shops ?? []).map((s) => {
    const agent = agentMap.get(s.id as string);
    const stats = jobStats.get(s.id as string) ?? { prints: 0, color_prints: 0, bw_prints: 0, revenue_paise: 0 };
    return {
      id: s.id,
      name: s.name,
      location: s.location,
      latitude: s.latitude != null ? Number(s.latitude) : null,
      longitude: s.longitude != null ? Number(s.longitude) : null,
      status: s.status,
      virtual_mode: s.virtual_mode,
      claimed: !!s.owner_id,
      created_at: s.created_at,
      agent_online: agent?.online ?? false,
      agent_platform: agent?.platform ?? null,
      agent_last_heartbeat: agent?.last_heartbeat ?? null,
      lifetime_prints: stats.prints,
      lifetime_color_prints: stats.color_prints,
      lifetime_bw_prints: stats.bw_prints,
      lifetime_revenue_paise: stats.revenue_paise,
    };
  });

  return Response.json({ printers });
}
