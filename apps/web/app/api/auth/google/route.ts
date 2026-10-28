import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authFailurePath, safeAuthNext } from "@/lib/auth-navigation";

export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const protocol = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "") || "http";
  const origin = `${protocol}://${host}`;
  const next = safeAuthNext(req.nextUrl.searchParams.get("next"));

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error || !data?.url) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(`${origin}${authFailurePath(next, "oauth_init_failed")}`);
    }

    return NextResponse.redirect(data.url);
  } catch (err) {
    console.error("OAuth route error:", err);
    return NextResponse.redirect(`${origin}${authFailurePath(next, "oauth_init_failed")}`);
  }
}
