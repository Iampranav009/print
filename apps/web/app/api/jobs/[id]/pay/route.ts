import { getSupabase } from "@/lib/supabase";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createOrder, isCashfreeProduction } from "@/lib/cashfree";
import { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: job, error: jobErr } = await supabase
    .from("print_jobs")
    .select("id, price_paise, status, payment_method")
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
  if (job.payment_method === "cash") {
    return Response.json({ error: "Cash jobs are confirmed by the shop counter." }, { status: 400 });
  }

  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  const order = await createOrder(id, job.price_paise, {
    phone: user?.phone ?? (user?.user_metadata?.contact_phone as string | undefined),
    email: user?.email,
    name: typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === "string"
        ? user.user_metadata.name
        : undefined,
  });

  await supabase
    .from("print_jobs")
    .update({
      razorpay_order_id: order.orderId,
      status: "awaiting_payment",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase.from("payments").insert({
    print_job_id: id,
    razorpay_order_id: order.orderId,
    amount_paise: job.price_paise,
    status: "pending",
  });

  return Response.json({
    orderId: order.orderId,
    paymentSessionId: order.paymentSessionId,
    cashfreeMode: isCashfreeProduction() ? "production" : "sandbox",
    amount: job.price_paise,
    currency: "INR",
  });
}
