"use client";
import { useState } from "react";
import Link from "next/link";

export default function AgentDownloadPage() {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  async function createLink() {
    setBusy(true); setError(""); setCopied(false);
    try {
      const response = await fetch("/api/vendor/agent/pair-link", { method: "POST" });
      const result: { link?: string; error?: string } = await response.json();
      if (!response.ok || !result.link) throw new Error(result.error || "Could not create connection link.");
      setLink(result.link);
    } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-2xl space-y-7 p-6">
    <Link href="/vendor/printer" className="text-indigo-600">← Your printers</Link>
    <div><h1 className="text-3xl font-bold">PrintBuddy for Windows</h1><p className="mt-2 text-zinc-500">Connect your shop once. Printing takes care of itself.</p></div>
    <section className="space-y-4 rounded-2xl border bg-white p-6"><h2 className="text-lg font-semibold">1. Download and open the app</h2>
      <a href="/downloads/PrintBuddy-Setup.exe" download className="inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">Download for Windows</a>
      <p className="text-sm text-zinc-500">Windows 10/11, 64-bit. No Python, commands or settings files. The app automatically lists printers installed on the computer.</p>
    </section>
    <section className="space-y-4 rounded-2xl border bg-white p-6"><h2 className="text-lg font-semibold">2. Paste your connection link into PrintBuddy</h2>
      <button disabled={busy} onClick={createLink} className="rounded-xl border px-5 py-3 font-semibold disabled:opacity-50">{busy ? "Preparing…" : link ? "Create a new link" : "Get my connection link"}</button>
      {link && <div className="space-y-3"><input aria-label="Shop connection link" readOnly value={link} onFocus={e => e.target.select()} className="w-full rounded-lg border p-3 text-sm" />
        <button className="text-sm font-semibold text-indigo-600" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setError("Select and copy the link above."); } }}>{copied ? "Copied" : "Copy link"}</button>
        <p className="text-xs text-zinc-500">Private to your shop. Works once and expires in 10 minutes. Connecting replaces this shop’s previous app connection.</p></div>}
    </section>
    <section className="space-y-3 rounded-2xl border bg-white p-6"><h2 className="text-lg font-semibold">3. Choose your printers</h2><p className="text-sm text-zinc-600">After the app says Connected, return to Your printers. The list updates automatically. Choose one printer for everything, or separate printers for color and black-and-white.</p><Link href="/vendor/printer" className="inline-block font-semibold text-indigo-600">Choose printers →</Link></section>
    <p className="text-sm text-zinc-500">The app stays in the Windows tray and starts after sign-in. Keep the computer awake and connected. You can close the dashboard.</p>
    <p className="text-xs text-zinc-500">This release is unsigned. Windows may show an unknown-publisher warning or block it under your organization’s security settings.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </main>;
}
