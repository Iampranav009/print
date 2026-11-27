import React from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fetchUserJobs } from "@/lib/jobs";
import { HistoryClient } from "./history-client";

export const metadata: Metadata = {
  title: "Print History",
  description: "View your past print jobs — status, cost, and release codes for each order.",
  robots: { index: false, follow: false },
};

export default async function HistoryPage() {
  const authed = await createClient();
  const {
    data: { user },
  } = await authed.auth.getUser();

  const jobs = user ? await fetchUserJobs(user.id) : [];

  return <HistoryClient initialJobs={jobs} />;
}
