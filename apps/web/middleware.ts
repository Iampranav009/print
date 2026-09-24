// Refreshes the Supabase auth session cookie on every request so the tokens
// don't silently expire while the user is active. Also gates /app/* behind
// a signed-in user, redirecting to /login when there's no session.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);

  let res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res;

  let pendingCookies: Array<{
    name: string;
    value: string;
    options: CookieOptions;
  }> = [];

  const applyPendingCookies = <T extends NextResponse>(response: T): T => {
    pendingCookies.forEach(({ name, value, options }) => {
      // Preserve Supabase's exact options. In particular, stale auth-cookie
      // chunks are removed with Max-Age=0; replacing that with a long lifetime
      // leaves dead chunks in the browser and can eventually exceed Vercel's
      // request-header limit.
      response.cookies.set(name, value, options);
    });
    return response;
  };

  const supabase = createServerClient(url, key, {
    cookieOptions: {
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        pendingCookies = cookiesToSet;
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        applyPendingCookies(res);
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();
  const authenticated = !!claimsData?.claims?.sub;

  const { pathname } = req.nextUrl;

  const createRedirect = (redirectUrl: URL | string) => {
    return applyPendingCookies(NextResponse.redirect(redirectUrl));
  };

  // Safety net: If Supabase falls back to Site URL with ?code=..., forward to /auth/callback
  const code = req.nextUrl.searchParams.get("code");
  if (code && !pathname.startsWith("/auth/callback")) {
    const callbackUrl = req.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return createRedirect(callbackUrl);
  }

  // Vendor login route handling
  const isVendorLogin = pathname === "/vendor/login" || pathname.startsWith("/vendor/login");
  if (isVendorLogin) {
    if (authenticated) {
      const next = req.nextUrl.searchParams.get("next") || "/vendor";
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = next.startsWith("/") ? next.split("?")[0] : "/vendor";
      redirectUrl.search = next.includes("?") ? "?" + next.split("?")[1] : "";
      return createRedirect(redirectUrl);
    }
    return res;
  }

  // Customer app + vendor portal + admin dashboard all need a signed-in
  // user. Middleware just checks presence — role/admin allowlist is
  // enforced by the layouts and API routes themselves.
  if ((pathname === "/vendor" || pathname.startsWith("/vendor/")) && !authenticated) {
    const vendorLoginUrl = req.nextUrl.clone();
    vendorLoginUrl.pathname = "/vendor/login";
    vendorLoginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    return createRedirect(vendorLoginUrl);
  }

  const AUTHED_ROOTS = ["/app", "/dashboard"];
  if (AUTHED_ROOTS.some((p) => pathname === p || pathname.startsWith(p + "/")) && !authenticated) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    return createRedirect(loginUrl);
  }

  if (pathname === "/login" && authenticated) {
    const next = req.nextUrl.searchParams.get("next") || "/app/print";
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = next.startsWith("/") ? next.split("?")[0] : "/app/print";
    redirectUrl.search = next.includes("?") ? "?" + next.split("?")[1] : "";
    return createRedirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    // Refresh auth only where a session is actually read. Avoid rewriting
    // chunked auth cookies for public pages, static files and unrelated APIs.
    "/app/:path*",
    "/vendor/:path*",
    "/dashboard/:path*",
    "/login",
    "/auth/callback",
  ],
};
