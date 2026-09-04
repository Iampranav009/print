"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Store } from "lucide-react";
import { AuthComponent } from "@/components/ui/sign-up";
import Link from "next/link";

function VendorLoginContent() {
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get("next") || "/vendor";
  const errorParam = searchParams?.get("error");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    if (errorParam) {
      if (errorParam === "oauth_init_failed") {
        setErrorMessage("Failed to initialize Google login. Please verify Supabase settings.");
      } else if (errorParam === "auth_callback_failed") {
        setErrorMessage("Authentication failed during callback. Please try again.");
      } else {
        setErrorMessage(errorParam);
      }
    }
  }, [errorParam]);

  const VendorLogo = () => (
    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30">
      <Store className="w-4 h-4 text-white" />
    </div>
  );

  return (
    <AuthComponent
      logo={<VendorLogo />}
      brandName="PrintBuddy Vendor"
      title="Vendor Portal"
      subtitle="Manage your shop, live queue, and earnings"
      nextUrl={nextParam}
      initialMode="signin"
      footerExtra={
        <div className="mt-4 pt-3 border-t border-border/80 flex flex-col items-center gap-2">
          {errorMessage && (
            <p className="text-xs text-destructive mb-1 font-medium">{errorMessage}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Looking for customer printing?{" "}
            <Link
              href="/login"
              className="font-semibold text-foreground underline hover:text-primary transition-colors cursor-pointer"
            >
              Customer sign in
            </Link>
          </p>
        </div>
      }
    />
  );
}

export default function VendorLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VendorLoginContent />
    </Suspense>
  );
}
