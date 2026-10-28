"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/client";
import { safeAuthNext } from "@/lib/auth-navigation";

export interface AuthComponentProps {
  logo?: ReactNode;
  brandName?: string;
  title?: string;
  subtitle?: string;
  initialMode?: "signin" | "signup";
  nextUrl?: string;
  allowModeToggle?: boolean;
  onGoogleSignIn?: () => void | Promise<void>;
  onEmailSignIn?: (email: string, password: string) => Promise<{ error?: string }>;
  onEmailSignUp?: (email: string, password: string) => Promise<{ error?: string }>;
  onSuccess?: () => void;
  footerExtra?: ReactNode;
}

export function AuthComponent({
  brandName = "HIMMER", title, subtitle, initialMode = "signin",
  nextUrl = "/app/print", allowModeToggle = true, onGoogleSignIn,
  onEmailSignIn, onEmailSignUp, onSuccess, footerExtra,
}: AuthComponentProps) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // A ref closes the gap before React renders a disabled button.
  const submitting = useRef(false);
  const destination = safeAuthNext(nextUrl);

  const release = () => { submitting.current = false; setPending(null); };
  useEffect(() => {
    const restore = () => { submitting.current = false; setPending(null); };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  async function googleSignIn() {
    if (submitting.current) return;
    submitting.current = true;
    setPending("google");
    setError("");
    setNotice("");
    try {
      if (onGoogleSignIn) { await onGoogleSignIn(); release(); }
      else window.location.assign(`/api/auth/google?next=${encodeURIComponent(destination)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in could not start. Please try again.");
      release();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    setNotice("");
    if (mode === "signup" && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    submitting.current = true;
    setPending("email");
    try {
      const customHandler = mode === "signin" ? onEmailSignIn : onEmailSignUp;
      if (customHandler) {
        const result = await customHandler(email.trim(), password);
        if (result.error) throw new Error(result.error);
      } else {
        const supabase = createClient();
        if (mode === "signup") {
          const { data, error: authError } = await supabase.auth.signUp({
            email: email.trim(), password,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}` },
          });
          if (authError) throw authError;
          if (!data.session) {
            setNotice("Check your email for a confirmation link. Confirm your address before signing in.");
            setPassword("");
            setConfirmation("");
            release();
            return;
          }
        } else {
          const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (authError) throw authError;
        }
      }
      if (onSuccess) { onSuccess(); release(); }
      else window.location.assign(destination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again.");
      release();
    }
  }

  return <div className="hm-auth min-h-screen w-full">
    <header className="hm-auth-header"><Brand /><Link href="/support" className="text-xs font-medium">Need a hand? ↗</Link></header>
    <main className="hm-auth-body flex items-center justify-center py-12">
      <section className="hm-auth-card" aria-labelledby="auth-title">
        <p className="mb-3 text-center text-[10px] uppercase tracking-[.15em] text-secondary-label">{brandName}</p>
        <h1 id="auth-title" className="text-center text-3xl font-semibold tracking-tight">{mode === "signup" ? "Create your account." : title || "Welcome back."}</h1>
        <p className="mt-4 mb-7 text-center text-sm text-secondary-label">{subtitle}</p>
        <button type="button" className="hm-auth-google" disabled={pending !== null} onClick={googleSignIn}>
          <span aria-hidden="true" className="font-bold text-lg">G</span>
          <span>{pending === "google" ? "Opening Google…" : "Continue with Google"}</span>
        </button>
        <div className="hm-auth-divider"><span>Or with email</span></div>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={pending !== null} className="space-y-4 min-w-0">
            <div><label htmlFor="auth-email" className="hm-auth-label">Email address</label>
              <input id="auth-email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="hm-auth-input" /></div>
            <div><label htmlFor="auth-password" className="hm-auth-label">Password</label>
              <div className="relative"><input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 6 : undefined} value={password} onChange={e => setPassword(e.target.value)} className="hm-auth-input pr-16" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-0 h-full text-xs font-semibold">{showPassword ? "Hide" : "Show"}</button></div></div>
            {mode === "signup" && <div><label htmlFor="auth-confirm" className="hm-auth-label">Confirm password</label><input id="auth-confirm" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={6} value={confirmation} onChange={e => setConfirmation(e.target.value)} className="hm-auth-input" /><p className="mt-2 text-xs text-secondary-label">Use at least 6 characters.</p></div>}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
            <button type="submit" className="hm-auth-submit">{pending === "email" ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
          </fieldset>
        </form>
        {allowModeToggle && <p className="mt-6 text-center text-sm text-secondary-label">{mode === "signin" ? "New to HIMMER? " : "Already have an account? "}<button type="button" disabled={pending !== null} onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); setPassword(""); setConfirmation(""); }} className="font-semibold underline text-foreground">{mode === "signin" ? "Sign up" : "Sign in"}</button></p>}
        {footerExtra}
      </section>
    </main>
  </div>;
}
