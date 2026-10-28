import { vendorShopId } from "@/lib/vendor-shop";
import { getSupabase } from "@/lib/supabase";
import { broadcastToKiosk } from "@/lib/kiosk-broadcast";

export async function POST() {
  const shopId = await vendorShopId();
  if (!shopId) return Response.json({ error: "Sign in as the shop owner." }, { status: 401 });

  const requestedAt = new Date().toISOString();
  const { error } = await getSupabase()
    .from("shops")
    .update({ kiosk_refresh_requested_at: requestedAt })
    .eq("id", shopId);
  if (error) {
    console.error("Could not persist kiosk refresh", error);
    return Response.json({ error: "Could not refresh the kiosk." }, { status: 503 });
  }

  await broadcastToKiosk(shopId, {
    type: "kiosk:reset",
    requestedAt,
    sentAt: requestedAt,
  });
  return Response.json(
    { ok: true, requestedAt },
    { headers: { "Cache-Control": "no-store" } }
  );
}
