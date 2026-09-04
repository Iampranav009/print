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
}

export async function GET(_req: NextRequest) {
  const { user, shopId } = await requireVendorShop();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!shopId) return Response.json({ error: "No shop assigned" }, { status: 404 });

  const supabase = getSupabase();

  const [{ data: shop }, { data: printer }, { data: agents }] = await Promise.all([
    supabase.from("shops").select("id, name, virtual_mode").eq("id", shopId).single(),
    supabase
      .from("printers")
      .select(
        "id, os_printer_name, status, capabilities_source, make_and_model, capabilities_updated_at, mode, connection_type, host, port, wifi_ssid, setup_notes, last_seen_at, online"
      )
      .eq("shop_id", shopId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agents")
      .select("id, status, last_heartbeat, platform")
      .eq("shop_id", shopId)
      .order("last_heartbeat", { ascending: false })
      .limit(1),
  ]);

  const nowMs = Date.now();
  const lastSeenMs = printer?.last_seen_at
    ? new Date(printer.last_seen_at).getTime()
    : agents?.[0]?.last_heartbeat
    ? new Date(agents[0].last_heartbeat).getTime()
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
    agent: agents?.[0] ?? null,
    status: {
      mode: printer?.mode ?? (shop?.virtual_mode ? "test" : "real"),
      online,
      last_seen_at: printer?.last_seen_at ?? agents?.[0]?.last_heartbeat ?? null,
      heartbeat_window_seconds: HEARTBEAT_WINDOW_MS / 1000,
    },
  });
}

export async function PUT(req: NextRequest) {
  const { user, shopId } = await requireVendorShop();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!shopId) return Response.json({ error: "No shop assigned" }, { status: 404 });

  const body = (await req.json()) as PrinterConfigBody;
  const supabase = getSupabase();

  // Ensure the shop has a printer row to update — a virtual-only shop may
  // never have registered one. Insert on first configure.
  const { data: existing } = await supabase
    .from("printers")
    .select("id")
    .eq("shop_id", shopId)
    .limit(1)
    .maybeSingle();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.mode !== undefined) patch.mode = body.mode;
  if (body.connection_type !== undefined) patch.connection_type = body.connection_type;
  if (body.host !== undefined) patch.host = body.host?.trim() || null;
  if (body.port !== undefined) patch.port = body.port;
  if (body.wifi_ssid !== undefined) patch.wifi_ssid = body.wifi_ssid?.trim() || null;
  if (body.os_printer_name !== undefined)
    patch.os_printer_name = body.os_printer_name?.trim() || null;
  if (body.setup_notes !== undefined) patch.setup_notes = body.setup_notes;

  let printerId: string | undefined;

  if (existing) {
    const { data: updated, error } = await supabase
      .from("printers")
      .update(patch)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    printerId = updated.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("printers")
      .insert({
        shop_id: shopId,
        os_printer_name: body.os_printer_name?.trim() || "default",
        mode: body.mode ?? "test",
        connection_type: body.connection_type ?? null,
        host: body.host?.trim() || null,
        port: body.port ?? null,
        wifi_ssid: body.wifi_ssid?.trim() || null,
        setup_notes: body.setup_notes ?? null,
      })
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    printerId = inserted.id;
  }

  // Keep shops.virtual_mode in lockstep with printer mode so the webhook's
  // isVirtualShop() check + the kiosk's live activity code stay correct.
  if (body.mode !== undefined) {
    await supabase
      .from("shops")
      .update({ virtual_mode: body.mode === "test" })
      .eq("id", shopId);
  }

  return Response.json({ ok: true, printer_id: printerId });
}
