import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: job, error } = await supabase
    .from("print_jobs")
    .select("id, shop_id, status, price_paise, pages, copies, color, paper, duplex, orientation, release_code, failure_reason, razorpay_order_id, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json({ job });
}
