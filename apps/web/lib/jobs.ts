import { getSupabase } from "@/lib/supabase";
import type { JobStatus } from "@/components/StatusPill";

export interface Job {
  id: string;
  shop_id: string;
  shop_name: string;
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
  file_name: string;
  created_at: string;
  updated_at: string;
}

interface JobRow extends Omit<Job, "shop_name" | "file_name"> {
  file_path: string | null;
  shops: { name: string } | null;
}

export async function fetchUserJobs(userId: string, limit?: number): Promise<Job[]> {
  // print_jobs has RLS with no SELECT policy for authenticated users, so the
  // anon client returns [] even for the owner. Service-role bypasses RLS; the
  // user_id filter keeps the scope correct.
  let query = getSupabase()
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
      file_path,
      created_at,
      updated_at,
      shops (
        name
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data } = await query;
  if (!data) return [];

  return (data as unknown as JobRow[]).map(({ file_path, shops, ...item }) => {
    const parts = file_path ? file_path.split("/") : [];
    const rawName = parts[parts.length - 1] || "document.pdf";
    return {
      ...item,
      shop_name: shops?.name || "HIMMER Shop",
      orientation: item.orientation || "portrait",
      file_name: rawName.replace(/^[0-9]+_/, ""),
    };
  });
}
