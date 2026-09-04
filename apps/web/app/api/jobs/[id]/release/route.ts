import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: job, error: jobErr } = await supabase
    .from("print_jobs")
    .select("id, status, release_code")
    .eq("id", id)
    .single();

  if (jobErr || !job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "awaiting_release" && job.status !== "dispatched") {
    return Response.json(
      { error: `Cannot release job in status: ${job.status}` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (body?.code && job.release_code && body.code.toString().trim() !== job.release_code.trim()) {
    return Response.json({ error: "Invalid release code" }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("print_jobs")
    .update({ status: "released", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) {
    return Response.json({ error: "Failed to release job" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
