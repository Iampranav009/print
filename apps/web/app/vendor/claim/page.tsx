"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type ClaimState =
  | { stage: "loading" }
  | { stage: "success" }
  | { stage: "error"; code: number; message: string };

const ERROR_LABELS: Record<number, { heading: string; detail: string }> = {
  400: { heading: "Invalid invite", detail: "This invite link is malformed." },
  403: { heading: "Not authorised", detail: "This invite was generated for a different email address." },
  404: { heading: "Invite not found", detail: "This invite link doesn't exist or has already been used." },
  409: { heading: "Already claimed", detail: "Your account is already linked to a shop." },
  410: { heading: "Invite expired", detail: "This invite link has expired. Ask the admin to generate a new one." },
};

export default function ClaimPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [state, setState] = useState<ClaimState>({ stage: "loading" });

  const attemptClaim = useCallback(async () => {
    if (!token) {
      setState({ stage: "error", code: 400, message: "No invite token found in the URL." });
      return;
    }

    try {
      const res = await fetch("/api/vendor/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        setState({ stage: "success" });
        setTimeout(() => {
          router.push("/vendor/onboarding");
        }, 2000);
        return;
      }

      const body = await res.json().catch(() => ({}));
      setState({
        stage: "error",
        code: res.status,
        message: body.error ?? "Something went wrong.",
      });
    } catch {
      setState({ stage: "error", code: 0, message: "Network error — check your connection and try again." });
    }
  }, [token, router]);

  useEffect(() => {
    attemptClaim();
  }, [attemptClaim]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 text-center space-y-5">
        {/* Logo */}
        <div className="mb-2">
          <span className="text-lg font-black tracking-tight text-indigo-600">Print</span>
          <span className="text-lg font-black tracking-tight text-zinc-900">Buddy</span>
        </div>

        {state.stage === "loading" && (
          <>
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold text-zinc-900">Claiming your shop…</h1>
            <p className="text-sm text-zinc-400">Verifying your invite. This only takes a second.</p>
          </>
        )}

        {state.stage === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold text-zinc-900">Shop claimed!</h1>
            <p className="text-sm text-zinc-400">Redirecting you to finish setup…</p>
          </>
        )}

        {state.stage === "error" && (() => {
          const known = ERROR_LABELS[state.code];
          return (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-500" aria-hidden="true" />
              </div>
              <h1 className="text-lg font-bold text-zinc-900">{known?.heading ?? "Claim failed"}</h1>
              <p className="text-sm text-zinc-400">{known?.detail ?? state.message}</p>
              {state.code !== 403 && state.code !== 409 && (
                <button
                  onClick={() => {
                    setState({ stage: "loading" });
                    attemptClaim();
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label="Retry claiming invite"
                >
                  Retry
                </button>
              )}
              {state.code === 409 && (
                <a
                  href="/vendor"
                  className="inline-block w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label="Go to vendor dashboard"
                >
                  Go to dashboard
                </a>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
