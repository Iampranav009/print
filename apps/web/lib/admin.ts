// Admin gate. An admin is a user whose email appears in ADMIN_EMAILS
// (comma-separated env var). Falls back to ADMIN_EMAIL for convenience.
//
// Used to gate the internal /dashboard and every /api/admin/* route.

import type { User } from "@supabase/supabase-js";

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
