import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminDashboardShell } from "@/components/dashboard/AdminDashboardShell";
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

  return <AdminDashboardShell adminEmail={user?.email ?? null} />;
}
