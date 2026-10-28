import { vendorShopId } from "@/lib/vendor-shop";
import { getSupabase } from "@/lib/supabase";

const ACTIVE_STATUSES = ["dispatched", "awaiting_release", "released", "printing"];
const STALE_DISPATCH_MS = 2 * 60 * 1000;
const STALE_PRINTING_MS = 10 * 60 * 1000;

export async function GET() {
  const shopId = await vendorShopId();
  if (!shopId) return Response.json({ error: "Sign in as the shop owner." }, { status: 401 });

  const supabase = getSupabase();
  const [{ data: jobs, error }, { data: agent }, { data: printer }] = await Promise.all([
    supabase
      .from("print_jobs")
      .select("id, status, display_name, file_path, pages, copies, color, price_paise, failure_reason, created_at, updated_at")
      .eq("shop_id", shopId)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("agents")
      .select("status, last_heartbeat")
      .eq("shop_id", shopId)
      .order("last_heartbeat", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("printers")
      .select("status, online, last_seen_at, os_printer_name, bw_os_printer_name, color_os_printer_name")
      .eq("shop_id", shopId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (error) return Response.json({ error: "Could not load the print queue." }, { status: 503 });

  const now = Date.now();
  const lastHeartbeat = agent?.last_heartbeat ? new Date(agent.last_heartbeat).getTime() : 0;
  const agentOnline = agent?.status === "online" && now - lastHeartbeat < 90_000;
  const printerOnline = agentOnline && printer?.online === true;

  return Response.json({
    connection: {
      agent_online: agentOnline,
      printer_online: printerOnline,
      printer_name: printer?.bw_os_printer_name || printer?.os_printer_name || printer?.color_os_printer_name || null,
      last_seen_at: printer?.last_seen_at || agent?.last_heartbeat || null,
    },
    jobs: (jobs ?? []).map((job) => {
      const ageMs = Math.max(0, now - new Date(job.updated_at).getTime());
      const needsAttention =
        (job.status === "printing" && ageMs >= STALE_PRINTING_MS) ||
        (job.status !== "printing" && ageMs >= STALE_DISPATCH_MS);
      return {
        ...job,
        file_name: job.file_path?.split("/").pop()?.replace(/^\d+_/, "") || "document",
        waiting_seconds: Math.floor(ageMs / 1000),
        needs_attention: needsAttention,
      };
    }),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
