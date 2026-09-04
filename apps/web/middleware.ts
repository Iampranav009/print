// Refreshes the Supabase auth session cookie on every request so the tokens
// don't silently expire while the user is active. Also gates /app/* behind
// a signed-in user, redirecting to /login when there's no session.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, {
            ...options,
            maxAge: options?.maxAge ?? 60 * 60 * 24 * 365, // 1 year remember me
            sameSite: "lax",
            path: "/",
          })
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  // Safety net: If Supabase falls back to Site URL with ?code=..., forward to /auth/callback
  const code = req.nextUrl.searchParams.get("code");
  if (code && !pathname.startsWith("/auth/callback")) {
    const callbackUrl = req.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  // Customer app + vendor portal + admin dashboard all need a signed-in
  // user. Middleware just checks presence — role/admin allowlist is
  // enforced by the layouts and API routes themselves.
  const AUTHED_ROOTS = ["/app", "/vendor", "/dashboard"];
  if (AUTHED_ROOTS.some((p) => pathname === p || pathname.startsWith(p + "/")) && !user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && user) {
    const next = req.nextUrl.searchParams.get("next") || "/app/print";
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = next.startsWith("/") ? next.split("?")[0] : "/app/print";
    redirectUrl.search = next.includes("?") ? "?" + next.split("?")[1] : "";
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    // Run on everything except static assets, favicons, and image files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
