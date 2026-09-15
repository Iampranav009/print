// Verify the shop-local OS printer through its outbound agent heartbeat.
import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

const HEARTBEAT_WINDOW_MS = 90_000;
export async function POST(_req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, virtual_mode")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!shop) return Response.json({ error: "No shop assigned" }, { status: 404 });

  const { data: printer } = await supabase
    .from("printers")
    .select("id, mode, connection_type, os_printer_name, online, last_seen_at")
    .eq("shop_id", shop.id)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  const mode = printer?.mode ?? (shop.virtual_mode ? "test" : "real");

  // ── Test mode: always green ────────────────────────────────────────────
  if (mode === "test") {
    if (printer) {
      await supabase
        .from("printers")
        .update({ online: true, last_seen_at: new Date().toISOString() })
        .eq("id", printer.id);
    }
    return Response.json({
      ok: true,
      mode: "test",
      message: "Virtual printer — always ready.",
    });
  }

  if (!printer) {
    return Response.json(
      { ok: false, error: "No printer configured yet. Select and save the installed printer first." },
      { status: 400 }
    );
  }

  // All real printers use the shop-local agent, including Wi-Fi and network.
  {
    const { data: agent } = await supabase
      .from("agents")
      .select("last_heartbeat")
      .eq("shop_id", shop.id)
      .order("last_heartbeat", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastMs = agent?.last_heartbeat ? new Date(agent.last_heartbeat).getTime() : 0;
    const seenMs = printer.last_seen_at ? new Date(printer.last_seen_at).getTime() : 0;
    const online = !!printer.os_printer_name && printer.online === true && lastMs > 0 && Date.now() - lastMs < HEARTBEAT_WINDOW_MS && seenMs > 0 && Date.now() - seenMs < HEARTBEAT_WINDOW_MS;

    return Response.json({
      ok: online,
      mode: "real",
      connection_type: printer.connection_type,
      message: online
        ? "The agent is connected and the selected printer is installed on the shop computer."
        : "Waiting for the agent to confirm the selected printer. Check that the agent is running and the printer is installed; allow up to 30 seconds after saving.",
      last_heartbeat_at: agent?.last_heartbeat ?? null,
    });
  }

}
