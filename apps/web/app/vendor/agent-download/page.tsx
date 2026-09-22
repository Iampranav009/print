"use client";
import { useState } from "react";
import Link from "next/link";

export default function AgentDownloadPage() {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  function checkDownload(event: React.MouseEvent<HTMLAnchorElement>) {
    // Only reject positively identified old Windows versions; mobile users may
    // download the file to transfer to the shop PC. Browsers can mask the OS.
    const version = /Windows NT (\d+)\.(\d+)/.exec(navigator.userAgent);
    if (version && Number(version[1]) < 10) {
      event.preventDefault();
      setError("This download requires Windows 10/11 (64-bit). For Windows 7 SP1, choose the Windows 7 download next to it.");
    }
  }
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <h3 className="font-semibold">Windows 10 / 11</h3>
          <p className="mt-1 mb-4 text-sm text-zinc-600">For 64-bit Windows PCs.</p>
          <a href="/downloads/PrintBuddy-Setup.exe" download onClick={checkDownload} className="mt-auto inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Download Windows 10 / 11</a>
        </div>
        <div className="flex flex-col rounded-xl border border-zinc-200 p-4">
          <h3 className="font-semibold">Windows 7 SP1</h3>
          <p className="mt-1 mb-4 text-sm text-zinc-600">Legacy edition for 32-bit and 64-bit PCs. Includes the PDF printing engine.</p>
          <a href="/downloads/PrintBuddy-Windows7-Setup.exe" download className="mt-auto inline-flex min-h-12 items-center justify-center rounded-xl border border-indigo-600 px-4 py-3 text-center font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Download Windows 7</a>
        </div>
      </div>
      <p className="text-sm text-zinc-500">No separate Python installation or manual credentials. Download the edition matching the shop PC, open it, then paste your connection link.</p>
      <details className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600">
        <summary className="cursor-pointer font-semibold text-zinc-900">Windows 7 requirements and troubleshooting</summary>
        <p className="mt-2">Requires Windows 7 Service Pack 1 with Windows runtime updates and an installed printer driver. This legacy edition uses older software and still needs validation on your shop PC.</p>
        <p className="mt-2">If the old installer showed python314.dll or api-ms-win-core-path-l1-1-0.dll errors, download the Windows 7 edition above. Do not copy DLLs from download websites.</p>
      </details>
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
