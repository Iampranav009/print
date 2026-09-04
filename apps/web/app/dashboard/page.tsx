import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { DashboardClient } from "./DashboardClient";
import { AdminSections } from "@/components/dashboard/AdminSections";
import { AdminNotAuthorised } from "@/components/dashboard/AdminNotAuthorised";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = user ? isAdmin(user) : false;

  if (!admin) {
    return <AdminNotAuthorised email={user?.email ?? null} />;
  }

  return (
    <main className="max-w-4xl mx-auto p-4 pt-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Admin Dashboard</h1>
        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          Admin Portal
        </span>
      </div>

      {/* Admin sections: Shops list + creator and Vendor invites */}
      <AdminSections />

      <hr className="border-zinc-200" />

      {/* Existing sections kept below: printer capabilities, pricing, dev simulate, print queue */}
      <DashboardClient />
    </main>
  );
}
