import { getSupabase } from "@/lib/supabase";
import { resolveAgentToken } from "@/lib/agent-auth";
import type { PrinterCapabilities } from "@printbuddy/shared";
import { NextRequest } from "next/server";

function isWellFormed(caps: PrinterCapabilities): boolean {
  return (
    Array.isArray(caps.media) && caps.media.length > 0 &&
    Array.isArray(caps.sides) && caps.sides.length > 0 &&
    Array.isArray(caps.number_up) && caps.number_up.length > 0
  );
}

export async function POST(req: NextRequest) {
  const agent = await resolveAgentToken(req.headers.get("authorization"));
  if (!agent) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { capabilities, make_and_model } = body as {
    capabilities: PrinterCapabilities;
    make_and_model?: string;
  };

  if (!capabilities || typeof capabilities !== "object") {
    return Response.json({ error: "Missing capabilities object" }, { status: 400 });
  }

  if (!isWellFormed(capabilities)) {
    return Response.json(
      { error: "Capability set is empty or malformed — media, sides, and number_up must be non-empty arrays" },
      { status: 422 }
    );
  }

  const supabase = getSupabase();

  const { data: printer } = await supabase
    .from("printers")
    .select("capabilities_source")
    .eq("shop_id", agent.shopId)
    .limit(1)
    .single();

  if (printer?.capabilities_source === "manual") {
    return Response.json({ applied: false, reason: "manual override" });
  }

  const { error } = await supabase
    .from("printers")
    .update({
      capabilities,
      capabilities_source: "discovered",
      make_and_model: make_and_model ?? null,
      capabilities_updated_at: new Date().toISOString(),
    })
    .eq("shop_id", agent.shopId);

  if (error) {
    return Response.json({ error: "Failed to update capabilities" }, { status: 500 });
  }

  return Response.json({ applied: true });
}
