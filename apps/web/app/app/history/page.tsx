import React from "react";
import { createClient } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";
import { HistoryClient, type Job } from "./history-client";
import { type JobStatus } from "@/components/StatusPill";

interface HistoryRow {
  id: string;
  shop_id: string;
  user_id: string;
  status: JobStatus;
  price_paise: number;
  pages: number;
  copies: number;
  color: boolean;
  paper: string;
  duplex: boolean;
  orientation: "portrait" | "landscape";
  release_code: string | null;
  failure_reason: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string;
  shops: { name: string } | null;
}

export default async function HistoryPage() {
  // Read the signed-in user via the anon cookie-aware client…
  const authed = await createClient();
  const {
    data: { user },
  } = await authed.auth.getUser();

  let jobs: Job[] = [];

  if (user) {
    // …but query print_jobs with the service-role client. print_jobs has
    // RLS enabled with no SELECT policy for authenticated users, so the
    // anon client returns [] even for the owner. Service-role bypasses
    // RLS; the .eq("user_id", user.id) filter keeps the scope correct.
    const supabase = getSupabase();

    const { data } = await supabase
      .from("print_jobs")
      .select(`
        id,
        shop_id,
        user_id,
        status,
        price_paise,
        pages,
        copies,
        color,
        paper,
        duplex,
        orientation,
        release_code,
        failure_reason,
        file_path,
        created_at,
        updated_at,
        shops (
          name
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const rows = data as unknown as HistoryRow[];
      jobs = rows.map((item) => {
        const parts = item.file_path ? item.file_path.split("/") : [];
        const rawName = parts[parts.length - 1] || "document.pdf";
        const fileName = rawName.replace(/^[0-9]+_/, "");

        return {
          id: item.id,
          shop_id: item.shop_id,
          shop_name: item.shops?.name || "PrintBuddy Shop",
          user_id: item.user_id,
          status: item.status,
          price_paise: item.price_paise,
          pages: item.pages,
          copies: item.copies,
          color: item.color,
          paper: item.paper,
          duplex: item.duplex,
          orientation: item.orientation || "portrait",
          release_code: item.release_code,
          failure_reason: item.failure_reason,
          file_name: fileName,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      });
    }
  }

  return <HistoryClient initialJobs={jobs} />;
}
