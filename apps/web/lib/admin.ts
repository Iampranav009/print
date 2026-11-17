// Admin gate. An admin is a user whose email appears in ADMIN_EMAILS
// (comma-separated env var). Falls back to ADMIN_EMAIL for convenience.
//
// Used to gate the internal /dashboard and every /api/admin/* route.

import type { User } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

function adminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdmin(user: Pick<User, "email"> | null | undefined): boolean {
  if (!user?.email) return false;
  const allow = adminEmailSet();
  if (allow.size === 0) return false;
  return allow.has(user.email.toLowerCase());
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailSet().has(email.toLowerCase());
}

export async function requireAdmin() {
  const authed = await createServerSupabase();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return { user: null, error: "Unauthorized" as const, status: 401 };
  if (!isAdmin(user)) return { user, error: "Forbidden" as const, status: 403 };
  return { user, error: null, status: 200 };
}
