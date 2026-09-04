import { getSupabase } from "@/lib/supabase";
import { getRazorpay } from "@/lib/razorpay";
import { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: job, error: jobErr } = await supabase
    .from("print_jobs")
    .select("id, price_paise, status")
    .eq("id", id)
    .single();

  if (jobErr || !job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "priced") {
    return Response.json(
      { error: `Cannot pay for job in status: ${job.status}` },
      { status: 400 }
    );
  }

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: job.price_paise,
    currency: "INR",
    receipt: id,
    notes: { job_id: id },
  });

  await supabase
    .from("print_jobs")
    .update({
      razorpay_order_id: order.id,
      status: "awaiting_payment",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase.from("payments").insert({
    print_job_id: id,
    razorpay_order_id: order.id,
    amount_paise: job.price_paise,
    status: "pending",
  });

  return Response.json({
    orderId: order.id,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: job.price_paise,
    currency: "INR",
  });
}
