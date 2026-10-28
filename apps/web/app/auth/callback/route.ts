// OAuth callback — Supabase redirects here after Google sign-in with a
// short-lived `code` in the query string. We exchange it for a session,
// which sets the auth cookies, then send the user back to `next`.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authFailurePath, safeAuthNext } from "@/lib/auth-navigation";

export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const protocol = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "") || "http";
  const origin = `${protocol}://${host}`;
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const next = safeAuthNext(searchParams.get("next"));

  try {
  if (code && !searchParams.has("error")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  } catch {
    // Return to the appropriate form so a failed exchange can be retried.
  }
  return NextResponse.redirect(`${origin}${authFailurePath(next, searchParams.get("error") === "access_denied" ? "oauth_cancelled" : "auth_callback_failed")}`);
}
