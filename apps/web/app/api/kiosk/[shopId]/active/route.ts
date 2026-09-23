import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Public display data: names and progress only. Never return the PDF path,
// release code, payment identifiers, phone number or customer account ID.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const supabase = getSupabase();
  let [{ data: ready, error }, { data: recent }] = await Promise.all([
    supabase.from("print_jobs")
      .select("id, shop_id, display_name, status, price_paise, created_at, updated_at")
      .eq("shop_id", shopId)
      .in("status", ["dispatched", "awaiting_release", "released", "printing"])
      .order("updated_at", { ascending: true })
      .limit(50),
    supabase.from("print_jobs")
      .select("id, shop_id, display_name, status, price_paise, created_at, updated_at")
      .eq("shop_id", shopId)
      .in("status", ["printed", "print_failed", "refunded"])
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);
  // Keep the existing kiosk operational while the new name migration is
  // being deployed. Its queue still works; labels fall back to Customer.
  if (["42703", "PGRST204"].includes(error?.code ?? "")) {
    const fallback = await Promise.all([
      supabase.from("print_jobs")
        .select("id, shop_id, status, price_paise, created_at, updated_at")
        .eq("shop_id", shopId)
        .in("status", ["dispatched", "awaiting_release", "released", "printing"])
        .order("updated_at", { ascending: true }).limit(50),
      supabase.from("print_jobs")
        .select("id, shop_id, status, price_paise, created_at, updated_at")
        .eq("shop_id", shopId)
        .in("status", ["printed", "print_failed", "refunded"])
        .order("updated_at", { ascending: false }).limit(3),
    ]);
    ready = (fallback[0].data ?? []).map((job) => ({ ...job, display_name: null }));
    recent = (fallback[1].data ?? []).map((job) => ({ ...job, display_name: null }));
    error = fallback[0].error;
  }
  if (error) return Response.json({ error: "Queue unavailable" }, { status: 503 });
  const safe = (job: NonNullable<typeof ready>[number]) => ({
    id: job.id,
    shop_id: job.shop_id,
    display_name: job.display_name || "Customer",
    status: job.status,
    price_paise: job.price_paise,
    release_code: null,
    created_at: job.created_at,
    updated_at: job.updated_at,
  });
  const jobs = (ready ?? []).map(safe);
  const printing = jobs.find((j) => j.status === "printing");
  const active = printing ?? jobs[0] ?? null;
  return Response.json({
    active,
    queue: jobs.filter((j) => j.id !== active?.id),
    recent: (recent ?? []).map(safe),
  }, { headers: { "Cache-Control": "no-store" } });
}
