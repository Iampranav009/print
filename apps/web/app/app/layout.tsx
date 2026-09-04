import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/TabBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh h-dvh flex flex-col bg-white text-gray-900 overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
