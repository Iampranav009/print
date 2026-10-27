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
import { printerReady, type DiscoveredPrinter } from "@/lib/printer-presence";

export async function POST(req: NextRequest) {
  const agent = await resolveAgentToken(req.headers.get("authorization"));
  if (!agent) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    printerStatus?: string;
    discoveredPrinters?: DiscoveredPrinter[];
    printerName?: string;
    discoveryError?: boolean;
  };

  const now = new Date().toISOString();
  const supabase = getSupabase();
  const { data: printer, error: printerError } = await supabase
    .from("printers")
    .select("id, os_printer_name, bw_os_printer_name, color_os_printer_name, color_enabled, mode")
    .eq("shop_id", agent.shopId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (printerError) return Response.json({ error: "Could not load printer configuration" }, { status: 503 });
  const discovered = (Array.isArray(body.discoveredPrinters) ? body.discoveredPrinters : []).filter(p => p && typeof p.name === "string").map(p => ({...p, name: p.name.trim()}));
  const printerOnline = printerReady(printer, discovered);

  const { error: agentUpdateError } = await supabase
    .from("agents")
    .update({ last_heartbeat: now, status: "online" })
    .eq("id", agent.agentId);
  if (agentUpdateError) return Response.json({ error: "Could not save computer heartbeat" }, { status: 503 });

  const { error: printerUpdateError } = await supabase
    .from("printers")
    .update({
      online: printerOnline,
      last_seen_at: now,
      status: printerOnline ? "online" : "offline",
    })
    .eq("id", printer?.id ?? "00000000-0000-0000-0000-000000000000");
  if (printerUpdateError) return Response.json({ error: "Could not save printer status" }, { status: 503 });

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
        driver: typeof p.driver === "string" ? p.driver.trim() : null,
        isDefault: !!p.isDefault,
        available: p.available !== false,
        status: typeof p.status === "string" ? p.status.slice(0, 80) : "unknown",
      }));

    const { error: discoveryUpdateError } = await supabase
      .from("shops")
      .update({
        discovered_printers: cleaned,
        discovered_at: now,
      })
      .eq("id", agent.shopId);
    if (discoveryUpdateError) return Response.json({ error: "Could not save detected printers" }, { status: 503 });
  }

  if (body.discoveryError) {
    const { error } = await supabase.from("shops").update({ discovered_at: null }).eq("id", agent.shopId);
    if (error) return Response.json({ error: "Could not update discovery status" }, { status: 503 });
  }

  // Read sound settings so the agent can pick up operator toggle changes.
  const { data: shop, error: shopErr } = await supabase
    .from("shops")
    .select("sound_enabled, sound_language, sound_volume")
    .eq("id", agent.shopId)
    .maybeSingle();

  if (shopErr) {
    // Migration 0019 likely not applied yet — columns don't exist.
    console.warn(
      "[agent/heartbeat] Could not read sound settings (run migration 0019):",
      shopErr.message
    );
  }

  return Response.json({
    ok: true,
    printerOnline,
    printerConfig: printer ?? { os_printer_name: null },
    soundSettings: {
      enabled: shop?.sound_enabled ?? false,
      language: shop?.sound_language ?? "en",
      volume: shop?.sound_volume ?? 80,
    },
  });
}
