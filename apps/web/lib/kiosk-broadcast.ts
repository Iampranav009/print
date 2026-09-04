// Server-side broadcast helper. The Razorpay webhook and the virtual-print
// ticker use this to push events to the kiosk WebSocket channel WITHOUT
// depending on postgres_changes — which is subject to RLS on print_jobs
// and doesn't reach anon subscribers reliably.
//
// Uses the service-role Supabase client so it's not blocked by RLS.

import { getSupabase } from "@/lib/supabase";
import {
  KIOSK_BROADCAST_EVENT,
  kioskChannelName,
  type KioskEvent,
} from "@/lib/kiosk-events";

/**
 * Send a broadcast event to the kiosk channel for a shop. Returns a
 * promise the caller can ignore — failures are logged and swallowed.
 */
export async function broadcastToKiosk(
  shopId: string,
  event: KioskEvent
): Promise<void> {
  try {
    const supabase = getSupabase();
    const channel = supabase.channel(kioskChannelName(shopId));

    // Wait for the channel to be joined before sending, otherwise the
    // send is dropped silently. Time out after 2s so a slow Realtime
    // link doesn't hold up the webhook response.
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), 2000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    await channel.send({
      type: "broadcast",
      event: KIOSK_BROADCAST_EVENT,
      payload: event,
    });

    // Best-effort cleanup — don't wait on the socket close.
    supabase.removeChannel(channel);
  } catch (err) {
    console.error("[kiosk-broadcast] failed", { shopId, type: event.type, err });
  }
}
