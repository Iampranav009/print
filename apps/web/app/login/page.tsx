"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, Printer } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        if (err === "oauth_init_failed") {
          setError("Failed to initialize Google login. Please verify Supabase settings.");
        } else if (err === "auth_callback_failed") {
          setError("Authentication failed during callback. Please try again.");
        } else {
          setError(err);
        }
      }
    }
  }, []);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-between p-6 bg-white text-gray-900">
      {/* Top spacer */}
      <div />

      {/* Center content */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center">
        {/* Brand icon */}
        <div className="w-20 h-20 rounded-3xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30 mb-6">
          <Printer className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900">PrintBuddy</h1>
        <p className="text-sm text-gray-500 mt-2 mb-10 leading-relaxed">
          Self-serve printing · Scan · Pay · Print
        </p>

        {/* Features */}
        <div className="w-full grid grid-cols-3 gap-3 mb-10">
          {[
            { icon: "📄", label: "Upload Docs" },
            { icon: "💳", label: "UPI Pay" },
            { icon: "🖨️", label: "Auto Print" },
          ].map((f) => (
            <div key={f.label} className="bg-gray-50 rounded-2xl p-3 text-center">
              <div className="text-2xl mb-1">{f.icon}</div>
              <p className="text-[10px] font-semibold text-gray-600">{f.label}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="w-full mb-5 flex items-start gap-2.5 bg-red-50 text-red-700 p-3.5 rounded-xl text-xs text-left border border-red-100"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google login */}
        <a
          href="/api/auth/google"
          onClick={() => setLoading(true)}
          aria-label="Continue with Google"
          className="w-full min-h-[56px] flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-semibold text-sm rounded-2xl border border-gray-200 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 cursor-pointer mb-4"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
          )}
          <span>{loading ? "Connecting…" : "Continue with Google"}</span>
        </a>

        <p className="text-xs text-gray-400 leading-relaxed">
          By continuing, you agree to PrintBuddy&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* Bottom */}
      <p className="text-[10px] text-gray-300">PrintBuddy &copy; {new Date().getFullYear()}</p>
    </main>
  );
}
