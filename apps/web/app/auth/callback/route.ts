// OAuth callback — Supabase redirects here after Google sign-in with a
// short-lived `code` in the query string. We exchange it for a session,
// which sets the auth cookies, then send the user back to `next`.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const protocol = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "") || "http";
  const origin = `${protocol}://${host}`;
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/app/print";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/app/print"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
