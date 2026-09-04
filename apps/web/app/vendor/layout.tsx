import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { VendorSidebar } from "@/components/vendor/VendorSidebar";
import { VendorTopBar } from "@/components/vendor/VendorTopBar";

type VendorMeResponse = {
  onboarded: boolean;
  hasShop: boolean;
  user: { id: string; email: string | null; name: string | null; avatar_url: string | null };
  profile: { user_id: string; full_name: string; phone: string; address: string | null; created_at: string; updated_at: string } | null;
  shop: { id: string; name: string; location: string | null; latitude: number | null; longitude: number | null; google_place_id: string | null; contact_email: string | null; contact_phone: string | null; status: string; virtual_mode: boolean } | null;
  bank: { shop_id: string; account_holder_name: string; account_number: string; ifsc_code: string; bank_name: string | null; branch: string | null; upi_id: string | null; verified: boolean; created_at: string; updated_at: string } | null;
};

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/vendor");
  }

  // Fetch vendor profile server-side (forwards cookies via absolute URL)
  let vendorData: VendorMeResponse | null = null;
  try {
    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const res = await fetch(`${protocol}://${host}/api/vendor/me`, {
      headers: {
        cookie: headersList.get("cookie") ?? "",
      },
      cache: "no-store",
    });
    if (res.ok) {
      vendorData = await res.json();
    }
  } catch {
    // Network error — treat as not onboarded
  }

  // Gate: redirect to onboarding if not set up yet
  if (vendorData && (!vendorData.onboarded || !vendorData.hasShop)) {
    redirect("/vendor/onboarding");
  }

  const shop = vendorData?.shop ?? null;
  const profile = vendorData?.profile ?? null;
  const vendorUser = vendorData?.user ?? null;

  const userName = profile?.full_name ?? vendorUser?.name ?? user.user_metadata?.full_name ?? null;
  const userEmail = user.email ?? null;
  const userAvatar = user.user_metadata?.avatar_url ?? null;

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* Sidebar */}
      <VendorSidebar
        userName={userName}
        userEmail={userEmail}
        userAvatar={userAvatar}
      />

      {/* Right column */}
      <div className="flex-1 flex flex-col min-w-0">
        <VendorTopBar
          shopName={shop?.name ?? null}
          shopStatus={shop?.status ?? null}
        />

        {/* Content */}
        <main className="flex-1 px-4 py-4 lg:px-8 lg:py-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
