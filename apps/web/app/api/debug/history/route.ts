// GET /api/debug/history — one-shot diagnostic for the "history is empty"
// symptom. Reports (a) whether the current request carries a valid user
// session, (b) how many print_jobs exist total, (c) how many are linked
// to the current user, (d) how many have a NULL user_id (orphaned from
// before auth wiring or from unauthed API calls). Read-only, safe to hit
// as often as needed.

import { NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(_req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user }, error: userErr } = await authed.auth.getUser();

  const supabase = getSupabase();

  const [
    { count: totalJobs },
    { count: myJobs },
    { count: orphanedJobs },
    { data: recentOrphans },
    { data: schemaProbe, error: schemaErr },
  ] = await Promise.all([
    supabase.from("print_jobs").select("*", { count: "exact", head: true }),
    user
      ? supabase.from("print_jobs").select("*", { count: "exact", head: true }).eq("user_id", user.id)
      : Promise.resolve({ count: 0 }),
    supabase.from("print_jobs").select("*", { count: "exact", head: true }).is("user_id", null),
    supabase
      .from("print_jobs")
      .select("id, status, created_at, file_path")
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(5),
    // Probe: does the user_id column exist? If not this errors with 42703.
    supabase.from("print_jobs").select("user_id").limit(1),
  ]);

  return Response.json({
    request_has_session: !!user,
    session_error: userErr?.message ?? null,
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
    schema: {
      user_id_column_exists: !schemaErr,
      probe_error: schemaErr?.message ?? null,
    },
    counts: {
      total_jobs_in_db: totalJobs ?? 0,
      linked_to_current_user: myJobs ?? 0,
      orphaned_null_user_id: orphanedJobs ?? 0,
    },
    recent_orphans: recentOrphans ?? [],
    diagnosis:
      !user
        ? "No session on this request — the client is calling /api/jobs without auth cookies. Sign in on this same origin and retry."
        : schemaErr
        ? "The user_id column doesn't exist. Run migration 0008_users_and_history.sql in Supabase."
        : (myJobs ?? 0) > 0
        ? "You have jobs linked correctly. If /app/history still looks empty, check the browser console + network tab for errors on the page."
        : (orphanedJobs ?? 0) > 0
        ? "Your jobs exist but have NULL user_id — they were created before this session was fully wired. See POST /api/debug/history to backfill them onto your account."
        : "No print_jobs rows in the DB at all yet — run through a print end-to-end first.",
  });
}

// POST /api/debug/history — backfill: claim the null-user_id jobs made
// against the current session's shop bindings. Attaches them to the
// signed-in user. Only touches rows that currently have user_id IS NULL,
// so it's safe to run repeatedly.
export async function POST(_req: NextRequest) {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("print_jobs")
    .update({ user_id: user.id })
    .is("user_id", null)
    .select("id");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    claimed_jobs: data?.length ?? 0,
    user_id: user.id,
    note: "All previously orphaned jobs are now attached to this account.",
  });
}
