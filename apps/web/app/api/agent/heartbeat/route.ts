// POST /api/agent/heartbeat — the local Python agent pings this every
// ~30s. Accepts:
//   printerStatus:       "online" | "offline" | ...   (string, optional)
//   discoveredPrinters:  Array<{name, driver?, isDefault?}> (optional)
//
// Response includes soundSettings so the agent can pick up operator changes
// within one heartbeat cycle without restarting.

import { getSupabase } from "@/lib/supabase";
import { resolveAgentToken } from "@/lib/agent-auth";
import { NextRequest } from "next/server";

interface DiscoveredPrinter {
  name: string;
  driver?: string;
  isDefault?: boolean;
}

export async function POST(req: NextRequest) {
  const agent = await resolveAgentToken(req.headers.get("authorization"));
  if (!agent) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    printerStatus?: string;
    discoveredPrinters?: DiscoveredPrinter[];
  };

  const now = new Date().toISOString();
  const supabase = getSupabase();

  await supabase
    .from("agents")
    .update({ last_heartbeat: now, status: "online" })
    .eq("id", agent.agentId);

  await supabase
    .from("printers")
    .update({
      online: true,
      last_seen_at: now,
      ...(body.printerStatus ? { status: body.printerStatus } : {}),
    })
    .eq("shop_id", agent.shopId);

  if (Array.isArray(body.discoveredPrinters)) {
    const seen = new Set<string>();
    const cleaned = body.discoveredPrinters
      .filter(
        (p): p is DiscoveredPrinter =>
          !!p && typeof p.name === "string" && p.name.trim().length > 0
      )
      .filter((p) => {
        const k = p.name.trim();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 50)
      .map((p) => ({
        name: p.name.trim(),
        driver: p.driver?.trim() || null,
        isDefault: !!p.isDefault,
      }));

    await supabase
      .from("shops")
      .update({
        discovered_printers: cleaned,
        discovered_at: now,
      })
      .eq("id", agent.shopId);
  }

  // Read sound settings so the agent can pick up operator toggle changes.
  const { data: shop } = await supabase
    .from("shops")
    .select("sound_enabled, sound_language, sound_volume")
    .eq("id", agent.shopId)
    .maybeSingle();

  return Response.json({
    ok: true,
    soundSettings: {
      enabled: shop?.sound_enabled ?? false,
      language: shop?.sound_language ?? "en",
      volume: shop?.sound_volume ?? 80,
    },
  });
}
