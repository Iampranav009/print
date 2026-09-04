import { getSupabase } from "@/lib/supabase";
import { DEFAULT_CAPABILITIES } from "@printbuddy/shared";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = getSupabase();

  const { data: shop, error: shopErr } = await supabase
    .from("shops")
    .select("id, name, location, status, virtual_mode")
    .eq("id", shopId)
    .single();

  if (shopErr || !shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  if (shop.status !== "active") {
    return Response.json({ error: "Shop is not active" }, { status: 404 });
  }

  const { data: pricing, error: pricingErr } = await supabase
    .from("pricing")
    .select(
      "bw_page_paise, color_page_paise, a3_multiplier, duplex_factor, min_charge_paise, media_type_surcharges"
    )
    .eq("shop_id", shopId)
    .single();

  if (pricingErr || !pricing) {
    return Response.json({ error: "Pricing not configured" }, { status: 500 });
  }

  const { data: printers } = await supabase
    .from("printers")
    .select(
      "capabilities, capabilities_source, make_and_model, capabilities_updated_at, mode, online, last_seen_at, connection_type"
    )
    .eq("shop_id", shopId)
    .order("created_at", { ascending: true });

  const printerList = (printers ?? []).map((p) => ({
    capabilities: p.capabilities ?? null,
    capabilities_source: p.capabilities_source ?? "default",
    make_and_model: p.make_and_model ?? null,
    capabilities_updated_at: p.capabilities_updated_at ?? null,
    mode: p.mode ?? (shop.virtual_mode ? "test" : "real"),
    online: !!p.online,
    last_seen_at: p.last_seen_at ?? null,
    connection_type: p.connection_type ?? null,
  }));

  // Fall back to the default capability set when a shop has no registered
  // printer yet — virtual/demo shops don't need a real printer to accept
  // orders, and the print UI needs *something* to render controls against.
  const capabilities = printerList[0]?.capabilities ?? DEFAULT_CAPABILITIES;

  // Derived: is the shop's printer effectively online right now?
  // Test-mode shops (virtual printer) are always online. Real-mode shops
  // are online only if the printer's heartbeat is recent.
  const HEARTBEAT_WINDOW_MS = 90_000;
  const primary = printerList[0];
  const primaryMode = primary?.mode ?? (shop.virtual_mode ? "test" : "real");
  const lastSeenMs = primary?.last_seen_at ? new Date(primary.last_seen_at).getTime() : 0;
  const printerOnline =
    primaryMode === "test" ||
    (lastSeenMs > 0 && Date.now() - lastSeenMs < HEARTBEAT_WINDOW_MS);

  return Response.json({
    shop,
    pricing,
    printers: printerList,
    capabilities,
    printer_status: {
      mode: primaryMode,
      online: printerOnline,
      last_seen_at: primary?.last_seen_at ?? null,
      connection_type: primary?.connection_type ?? null,
    },
  });
}
