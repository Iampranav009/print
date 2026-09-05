// GET  /api/vendor/printer — printer connection + mode + live status for
//                            the signed-in vendor's shop.
// PUT  /api/vendor/printer — update mode + connection config in one call.
//
// Online detection: printer is "online" if last_seen_at is within
// HEARTBEAT_WINDOW_MS (agent heartbeats every 30s in production). In test
// mode online is always true — the virtual printer never dies.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

const HEARTBEAT_WINDOW_MS = 90_000; // 90s grace

async function requireVendorShop() {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return { user: null, shopId: null as string | null };

  const supabase = getSupabase();
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  return { user, shopId: shop?.id ?? null };
}

interface PrinterConfigBody {
  mode?: "test" | "real";
  connection_type?: "wifi" | "usb" | "network" | null;
  host?: string | null;
  port?: number | null;
  wifi_ssid?: string | null;
  os_printer_name?: string | null;
  setup_notes?: string | null;
  // Partner-controlled feature toggles (migration 0018). B&W is always
  // on — customers can always print in mono. Color and duplex can be
  // switched off if the printer doesn't support them or the partner
  // just doesn't want to offer them.
  color_enabled?: boolean;
  duplex_enabled?: boolean;
}

export async function GET(_req: NextRequest) {
  const { user, shopId } = await requireVendorShop();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!shopId) return Response.json({ error: "No shop assigned" }, { status: 404 });

  const supabase = getSupabase();

  const [{ data: shop }, { data: printer }, { data: agents }] = await Promise.all([
    supabase
      .from("shops")
      .select("id, name, virtual_mode, discovered_printers, discovered_at")
      .eq("id", shopId)
      .single(),
    supabase
      .from("printers")
      .select(
        "id, os_printer_name, status, capabilities_source, make_and_model, capabilities_updated_at, mode, connection_type, host, port, wifi_ssid, setup_notes, last_seen_at, online, color_enabled, duplex_enabled"
      )
      .eq("shop_id", shopId)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agents")
      .select("id, status, last_heartbeat, platform, agent_token")
      .eq("shop_id", shopId)
      .order("last_heartbeat", { ascending: false })
      .limit(1),
  ]);

  let agent = agents?.[0] ?? null;
  if (!agent) {
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { data: newAgent } = await supabase
      .from("agents")
      .insert({
        shop_id: shopId,
        agent_token: token,
        platform: "windows",
        status: "offline",
      })
      .select("id, status, last_heartbeat, platform, agent_token")
      .maybeSingle();
    agent = newAgent;
  }

  const nowMs = Date.now();
  const lastSeenMs = printer?.last_seen_at
    ? new Date(printer.last_seen_at).getTime()
    : agent?.last_heartbeat
    ? new Date(agent.last_heartbeat).getTime()
    : 0;

  const isTestMode = printer?.mode === "test" || shop?.virtual_mode === true;
  const online =
    isTestMode || (lastSeenMs > 0 && nowMs - lastSeenMs < HEARTBEAT_WINDOW_MS);

  return Response.json({
    shop: {
      id: shop?.id,
      name: shop?.name,
      virtual_mode: shop?.virtual_mode ?? false,
    },
    printer: printer ?? null,
    agent: agent ?? null,
    status: {
      mode: printer?.mode ?? (shop?.virtual_mode ? "test" : "real"),
      online,
      last_seen_at: printer?.last_seen_at ?? agents?.[0]?.last_heartbeat ?? null,
      heartbeat_window_seconds: HEARTBEAT_WINDOW_MS / 1000,
    },
    // OS printer names auto-discovered by the local agent. The partner
    // UI reads this to populate a dropdown so they don't have to type
    // the exact CUPS/Windows printer name by hand.
    discovered_printers: (shop?.discovered_printers as unknown[] | undefined) ?? [],
    discovered_at: shop?.discovered_at ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const { user, shopId } = await requireVendorShop();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!shopId) return Response.json({ error: "No shop assigned" }, { status: 404 });

  const body = (await req.json()) as PrinterConfigBody;
  const supabase = getSupabase();

  // 1. Source of truth for the auto-print pipeline is shops.virtual_mode.
  // Update this FIRST so a mode toggle succeeds even if the printer table
  // is missing migration 0016's new columns. This unblocks the vendor
  // even when the schema is only partially migrated.
  if (body.mode !== undefined) {
    const { error: shopErr } = await supabase
      .from("shops")
      .update({ virtual_mode: body.mode === "test" })
      .eq("id", shopId);
    if (shopErr) {
      console.error("[vendor/printer] shops.virtual_mode update failed", shopErr);
      return Response.json(
        {
          error: `Could not update shop mode: ${shopErr.message}`,
          detail: shopErr,
        },
        { status: 500 }
      );
    }
  }

  // 2. Try to sync printer-level fields. If migration 0016 hasn't been
  // applied yet the mode/connection columns won't exist — that's a
  // best-effort update; we still return success because the primary
  // source of truth (shops.virtual_mode) was updated above.
  const { data: existing } = await supabase
    .from("printers")
    .select("id")
    .eq("shop_id", shopId)
    .limit(1)
    .maybeSingle();

  const patch: Record<string, unknown> = {};
  if (body.mode !== undefined) patch.mode = body.mode;
  if (body.connection_type !== undefined) patch.connection_type = body.connection_type;
  if (body.host !== undefined) patch.host = body.host?.trim() || null;
  if (body.port !== undefined) patch.port = body.port;
  if (body.wifi_ssid !== undefined) patch.wifi_ssid = body.wifi_ssid?.trim() || null;
  if (body.os_printer_name !== undefined)
    patch.os_printer_name = body.os_printer_name?.trim() || null;
  if (body.setup_notes !== undefined) patch.setup_notes = body.setup_notes;
  if (body.color_enabled !== undefined) patch.color_enabled = body.color_enabled;
  if (body.duplex_enabled !== undefined) patch.duplex_enabled = body.duplex_enabled;

  let printerId: string | undefined;
  let schemaWarning: string | undefined;

  const tryUpdate = async (
    columns: Record<string, unknown>
  ): Promise<{ data: { id: string } | null; error: { message: string } | null }> => {
    if (!existing) return { data: null, error: null };
    if (Object.keys(columns).length === 0) {
      return { data: { id: existing.id }, error: null };
    }
    return await supabase
      .from("printers")
      .update(columns)
      .eq("id", existing.id)
      .select("id")
      .maybeSingle();
  };

  const tryInsert = async (
    columns: Record<string, unknown>
  ): Promise<{ data: { id: string } | null; error: { message: string } | null }> => {
    return await supabase.from("printers").insert(columns).select("id").maybeSingle();
  };

  const isMissingColumnErr = (msg?: string | null) =>
    !!msg && /column .* does not exist|Could not find the .* column/i.test(msg);

  if (existing) {
    let result = await tryUpdate(patch);
    if (result.error && isMissingColumnErr(result.error.message)) {
      // Retry with only the columns that shipped in the original schema —
      // i.e. drop the mode/connection_type/host/... fields.
      const legacyPatch: Record<string, unknown> = {};
      if (patch.os_printer_name !== undefined) {
        legacyPatch.os_printer_name = patch.os_printer_name;
      }
      if (Object.keys(legacyPatch).length > 0) {
        result = await tryUpdate(legacyPatch);
      } else {
        result = { data: { id: existing.id }, error: null };
      }
      schemaWarning =
        "Migration 0016 is not applied — printer connection fields skipped. Run supabase/migrations/0016_printer_connection.sql in Supabase to enable Wi-Fi/USB/Network config.";
    }
    if (result.error) {
      return Response.json(
        { error: `Printer row update failed: ${result.error.message}` },
        { status: 500 }
      );
    }
    printerId = result.data?.id;
  } else {
    const insertRow: Record<string, unknown> = {
      shop_id: shopId,
      os_printer_name: body.os_printer_name?.trim() || "default",
      mode: body.mode ?? "test",
      connection_type: body.connection_type ?? null,
      host: body.host?.trim() || null,
      port: body.port ?? null,
      wifi_ssid: body.wifi_ssid?.trim() || null,
      setup_notes: body.setup_notes ?? null,
    };
    let result = await tryInsert(insertRow);
    if (result.error && isMissingColumnErr(result.error.message)) {
      result = await tryInsert({
        shop_id: shopId,
        os_printer_name: insertRow.os_printer_name,
      });
      schemaWarning =
        "Migration 0016 is not applied — printer row created without connection fields.";
    }
    if (result.error) {
      return Response.json(
        { error: `Could not create printer row: ${result.error.message}` },
        { status: 500 }
      );
    }
    printerId = result.data?.id;
  }

  return Response.json({
    ok: true,
    printer_id: printerId,
    mode: body.mode,
    ...(schemaWarning ? { warning: schemaWarning } : {}),
  });
}
