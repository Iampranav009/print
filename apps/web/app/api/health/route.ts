import { NextRequest } from "next/server";

const PILOT_SHOP_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(_req: NextRequest) {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1. Supabase connection
  try {
    const { getSupabase } = await import("@/lib/supabase");
    const supabase = getSupabase();

    const { error } = await supabase
      .from("shops")
      .select("id")
      .limit(1);

    checks.supabase = error
      ? { ok: false, detail: error.message }
      : { ok: true };
  } catch (e: unknown) {
    checks.supabase = {
      ok: false,
      detail: e instanceof Error ? e.message : "Failed to connect",
    };
  }

  // 2. Documents bucket
  try {
    const { getSupabase } = await import("@/lib/supabase");
    const supabase = getSupabase();

    const { data, error } = await supabase.storage.getBucket("documents");

    if (error || !data) {
      checks.storage = { ok: false, detail: error?.message || "Bucket not found" };
    } else {
      checks.storage = { ok: true, detail: `public=${data.public}` };
    }
  } catch (e: unknown) {
    checks.storage = {
      ok: false,
      detail: e instanceof Error ? e.message : "Storage check failed",
    };
  }

  // 3. Pilot shop present
  try {
    const { getSupabase } = await import("@/lib/supabase");
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("shops")
      .select("id, name")
      .eq("id", PILOT_SHOP_ID)
      .single();

    if (error || !data) {
      checks.pilotShop = {
        ok: false,
        detail: "Pilot shop not found — run supabase/seed.sql",
      };
    } else {
      checks.pilotShop = { ok: true, detail: data.name };
    }
  } catch (e: unknown) {
    checks.pilotShop = {
      ok: false,
      detail: e instanceof Error ? e.message : "Check failed",
    };
  }

  // 4. Razorpay keys loaded
  const rzpKeyId = process.env.RAZORPAY_KEY_ID;
  const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
  const rzpWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (rzpKeyId && rzpSecret && rzpWebhookSecret) {
    checks.razorpay = { ok: true };
  } else {
    const missing: string[] = [];
    if (!rzpKeyId) missing.push("RAZORPAY_KEY_ID");
    if (!rzpSecret) missing.push("RAZORPAY_KEY_SECRET");
    if (!rzpWebhookSecret) missing.push("RAZORPAY_WEBHOOK_SECRET");
    checks.razorpay = { ok: false, detail: `Missing: ${missing.join(", ")}` };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return Response.json(
    { status: allOk ? "healthy" : "unhealthy", checks },
    { status: allOk ? 200 : 503 }
  );
}
