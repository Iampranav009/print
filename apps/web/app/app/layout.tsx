import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/TabBar";
import { AppTopBar } from "./top-bar";

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
    <div className="min-h-dvh h-dvh flex flex-col bg-white text-zinc-900 overflow-hidden">
      <AppTopBar />
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
