import { createClient } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";

export async function vendorShopId(): Promise<string | null> {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const { data } = await getSupabase().from("shops").select("id")
    .eq("owner_id", user.id).maybeSingle();
  return data?.id ?? null;
}
