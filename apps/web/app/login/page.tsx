"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { AuthComponent } from "@/components/ui/sign-up";
import Link from "next/link";

function LoginContent() {
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get("next") || "/app/print";
  const errorParam = searchParams?.get("error");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    if (errorParam) {
      if (errorParam === "oauth_cancelled") {
        setErrorMessage("Google sign-in was cancelled. Please try again or sign in with email.");
      } else if (errorParam === "oauth_init_failed") {
        setErrorMessage("Failed to initialize Google login. Please verify Supabase settings.");
      } else if (errorParam === "auth_callback_failed") {
        setErrorMessage("Authentication failed during callback. Please try again.");
      } else {
        setErrorMessage(errorParam);
      }
    }
  }, [errorParam]);

  const CustomerLogo = () => (
    <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center shadow-md shadow-green-600/30">
      <Printer className="w-4 h-4 text-white" />
    </div>
  );

  return (
    <AuthComponent
      logo={<CustomerLogo />}
      brandName="HIMMER"
      title="Your next print starts here."
      subtitle="Printing, made effortless. Scan · Pay · Print"
      nextUrl={nextParam}
      initialMode="signin"
      footerExtra={
        <div className="mt-4 pt-3 border-t border-border/80 flex flex-col items-center gap-2">
          {errorMessage && (
            <p className="text-xs text-destructive mb-1 font-medium">{errorMessage}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Are you a shop owner?{" "}
            <Link
              href={`/vendor/login${nextParam.startsWith("/vendor") ? `?next=${encodeURIComponent(nextParam)}` : ""}`}
              className="font-semibold text-foreground underline hover:text-primary transition-colors cursor-pointer"
            >
              Vendor sign in
            </Link>
          </p>
        </div>
      }
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
