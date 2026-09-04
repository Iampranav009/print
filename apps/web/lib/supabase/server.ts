import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const ONE_YEAR = 60 * 60 * 24 * 365;

  return createServerClient(url, anonKey, {
    cookieOptions: {
      maxAge: ONE_YEAR,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              maxAge: options?.maxAge ?? ONE_YEAR,
              sameSite: options?.sameSite ?? "lax",
              path: options?.path ?? "/",
              secure: process.env.NODE_ENV === "production",
            });
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // Can be ignored if middleware is refreshing sessions.
        }
      },
    },
  });
}
