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
    <div className="pb-mobile-shell min-h-dvh h-dvh flex flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth-ios">
        <div className="pb-mobile-content min-h-full">{children}</div>
      </main>
      <TabBar />
    </div>
  );
}
