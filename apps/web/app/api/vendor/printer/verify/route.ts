// POST /api/vendor/printer/verify — check whether the vendor's printer is
// actually reachable right now. Different strategies per mode:
//
//   test mode      → always OK (virtual printer never fails)
//   real / network → open a TCP socket to host:port (default 9100) with
//                    a 3s timeout — the standard raw-JetDirect port most
//                    network printers listen on
//   real / wifi    → same as network — assumes the printer got a static
//                    or reserved IP on the vendor's Wi-Fi
//   real / usb     → we can't probe a USB printer from a serverless
//                    edge function; instead we check the agent's
//                    heartbeat window (agent reports port health locally)
//
// Also updates printers.last_seen_at / online so the dashboard status pill
// flips green immediately on a successful verify.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";
import net from "net";

const HEARTBEAT_WINDOW_MS = 90_000;
const TCP_TIMEOUT_MS = 3_000;

async function tcpProbe(host: string, port: number): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const finish = (ok: boolean, error?: string) => {
      try {
        socket.destroy();
      } catch {}
      resolve({ ok, error });
    };
    socket.setTimeout(TCP_TIMEOUT_MS);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false, "Connection timed out"));
    socket.once("error", (err) => finish(false, err.message));
    try {
      socket.connect(port, host);
    } catch (err) {
      finish(false, err instanceof Error ? err.message : "connect failed");
    }
  });
}

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
    .select("id, mode, connection_type, host, port")
    .eq("shop_id", shop.id)
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
      { ok: false, error: "No printer configured yet. Save Wi-Fi or Network settings first." },
      { status: 400 }
    );
  }

  // ── Real / USB: rely on agent heartbeat window ─────────────────────────
  if (printer.connection_type === "usb") {
    const { data: agent } = await supabase
      .from("agents")
      .select("last_heartbeat")
      .eq("shop_id", shop.id)
      .order("last_heartbeat", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastMs = agent?.last_heartbeat ? new Date(agent.last_heartbeat).getTime() : 0;
    const online = lastMs > 0 && Date.now() - lastMs < HEARTBEAT_WINDOW_MS;

    await supabase
      .from("printers")
      .update({ online, last_seen_at: agent?.last_heartbeat ?? null })
      .eq("id", printer.id);

    return Response.json({
      ok: online,
      mode: "real",
      connection_type: "usb",
      message: online
        ? "Local agent is responding — the USB printer is reachable."
        : "No recent heartbeat from the local agent. Make sure the PrintBuddy agent app is running on the PC connected to the printer.",
      last_heartbeat_at: agent?.last_heartbeat ?? null,
    });
  }

  // ── Real / Wi-Fi & Network: TCP probe on host:port ─────────────────────
  const host = printer.host;
  const port = printer.port ?? 9100;
  if (!host) {
    return Response.json(
      { ok: false, error: "Printer IP / hostname isn't configured." },
      { status: 400 }
    );
  }

  const probe = await tcpProbe(host, port);
  await supabase
    .from("printers")
    .update({
      online: probe.ok,
      last_seen_at: probe.ok ? new Date().toISOString() : null,
    })
    .eq("id", printer.id);

  return Response.json({
    ok: probe.ok,
    mode: "real",
    connection_type: printer.connection_type,
    host,
    port,
    message: probe.ok
      ? `Reached ${host}:${port}. Printer is online.`
      : `Could not reach ${host}:${port} — ${probe.error ?? "unknown error"}. Check the printer is powered on, connected to the same network, and using the correct IP.`,
  });
}
