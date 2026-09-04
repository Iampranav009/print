"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, LogOut } from "lucide-react";

export function AdminNotAuthorised({ email }: { email: string | null }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-5 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-600">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Not authorised</h1>
          <p className="text-sm text-zinc-500 mt-2">
            Signed in as <span className="font-semibold text-zinc-800">{email ?? "unknown"}</span>. Contact PrintBuddy if this is a mistake.
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-sm font-medium text-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          aria-label="Sign out of PrintBuddy"
        >
          <LogOut className="w-4 h-4 text-zinc-500" />
          Sign out
        </button>
      </div>
    </div>
  );
}
