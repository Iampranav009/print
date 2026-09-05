// POST /api/agent/heartbeat — the local Python agent pings this every
// ~30s. Accepts:
//   printerStatus:       "online" | "offline" | ...   (string, optional)
//   discoveredPrinters:  Array<{name, driver?, isDefault?}> (optional)
//
// discoveredPrinters is cached on shops.discovered_printers so the
// partner dashboard can populate the "Which printer to use" dropdown
// without the partner having to type the CUPS/Windows printer name
// by hand.

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

  // Mark the shop's printer online + timestamped so the vendor dashboard
  // status pill and kiosk offline banner flip immediately — no separate
  // probe needed.
  await supabase
    .from("printers")
    .update({
      online: true,
      last_seen_at: now,
      ...(body.printerStatus ? { status: body.printerStatus } : {}),
    })
    .eq("shop_id", agent.shopId);

  if (Array.isArray(body.discoveredPrinters)) {
    // De-dupe by name, trim, cap at 50 so the row stays cheap to read
    // on every dashboard load.
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

  return Response.json({ ok: true });
}
