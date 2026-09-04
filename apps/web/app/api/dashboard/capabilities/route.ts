import { getSupabase } from "@/lib/supabase";
import type { PrinterCapabilities } from "@printbuddy/shared";
import { NextRequest } from "next/server";

const FULL_DEFAULT: PrinterCapabilities = {
  color: true,
  sides: ["one-sided", "two-sided-long-edge", "two-sided-short-edge"],
  media: ["A4", "A3", "A5", "Legal", "Letter"],
  media_types: ["plain", "glossy", "cardstock"],
  number_up: [1, 2, 4, 6, 9],
  quality: ["draft", "normal", "high"],
  finishings: ["staple", "punch"],
  collate: true,
  reverse: true,
  scaling: ["none", "fit-to-page", "shrink-to-fit"],
  max_copies: 99,
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shopId, action, capabilities } = body as {
    shopId: string;
    action: "set_manual" | "reset";
    capabilities?: PrinterCapabilities;
  };

  if (!shopId) {
    return Response.json({ error: "shopId required" }, { status: 400 });
  }

  const supabase = getSupabase();

  if (action === "set_manual") {
    if (!capabilities) {
      return Response.json({ error: "capabilities required for set_manual" }, { status: 400 });
    }
    const { error } = await supabase
      .from("printers")
      .update({
        capabilities,
        capabilities_source: "manual",
        capabilities_updated_at: new Date().toISOString(),
      })
      .eq("shop_id", shopId);

    if (error) {
      return Response.json({ error: "Failed to save capabilities" }, { status: 500 });
    }
    return Response.json({ ok: true, source: "manual" });
  }

  if (action === "reset") {
    const { data: printer } = await supabase
      .from("printers")
      .select("capabilities, capabilities_source")
      .eq("shop_id", shopId)
      .limit(1)
      .single();

    const resetSource =
      printer?.capabilities_source === "manual" ? "default" : printer?.capabilities_source ?? "default";

    const { error } = await supabase
      .from("printers")
      .update({
        capabilities: FULL_DEFAULT,
        capabilities_source: resetSource === "manual" ? "default" : resetSource,
        capabilities_updated_at: new Date().toISOString(),
      })
      .eq("shop_id", shopId);

    if (error) {
      return Response.json({ error: "Failed to reset capabilities" }, { status: 500 });
    }
    return Response.json({ ok: true, source: resetSource });
  }

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
