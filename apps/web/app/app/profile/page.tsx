import React from "react";
import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "./profile-client";

interface UserJobRow {
  id: string;
  price_paise: number;
  status: string;
  shop_id: string;
  shops: { name: string } | null;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let totalPrints = 0;
  let totalSpentPaise = 0;
  let favoriteShop = "—";

  if (user) {
    const { data: userJobsData } = await supabase
      .from("print_jobs")
      .select(`
        id,
        price_paise,
        status,
        shop_id,
        shops (
          name
        )
      `)
      .eq("user_id", user.id);

    if (userJobsData && userJobsData.length > 0) {
      const userJobs = userJobsData as unknown as UserJobRow[];
      const successfulJobs = userJobs.filter((j) =>
        ["paid", "awaiting_release", "released", "printed", "done"].includes(j.status)
      );
      totalPrints = successfulJobs.length;
      totalSpentPaise = successfulJobs.reduce(
        (sum, j) => sum + (j.price_paise || 0),
        0
      );

      // Compute favorite shop
      const shopCounts: Record<string, { count: number; name: string }> = {};
      for (const job of userJobs) {
        const sId = job.shop_id;
        const sName = job.shops?.name || "PrintBuddy Shop";
        if (!shopCounts[sId]) {
          shopCounts[sId] = { count: 0, name: sName };
        }
        shopCounts[sId].count++;
      }

      let maxCount = 0;
      for (const key of Object.keys(shopCounts)) {
        if (shopCounts[key].count > maxCount) {
          maxCount = shopCounts[key].count;
          favoriteShop = shopCounts[key].name;
        }
      }
    }
  }

  const userData = {
    id: user?.id || "",
    email: user?.email,
    fullName:
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "PrintBuddy User",
    avatarUrl: user?.user_metadata?.avatar_url || user?.user_metadata?.picture,
  };

  return (
    <ProfileClient
      user={userData}
      stats={{
        totalPrints,
        totalSpentPaise,
        favoriteShop,
      }}
    />
  );
}
