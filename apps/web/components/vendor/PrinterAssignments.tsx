"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Props {
  printers: Array<{ name: string }>;
  bw: string;
  color: string;
  discoveredAt: string | null;
  onSaved: () => Promise<void>;
}

export function PrinterAssignments({ printers, bw, color, discoveredAt, onSaved }: Props) {
  const [blackWhite, setBlackWhite] = useState(bw);
  const [colorPrinter, setColorPrinter] = useState(color);
  const [same, setSame] = useState(!color || color === bw);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const stale = !discoveredAt || now - Date.parse(discoveredAt) > 90_000;
  const names = new Set(printers.map(p => p.name));
  function choices(selected: string) {
    return <><option value="">Select a printer</option>
      {selected && !names.has(selected) && <option value={selected} disabled>{selected} (not detected)</option>}
      {printers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</>;
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/vendor/printer", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        bw_os_printer_name: blackWhite, color_os_printer_name: same ? blackWhite : colorPrinter,
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save printers.");
      await onSaved(); setMessage("Printer choices saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save printers."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
      <h2 className="text-lg font-semibold">Your printers</h2>
      <p className="mt-1 text-sm text-zinc-500">Printers are detected automatically by the PrintBuddy app.</p>
    </div><Link href="/vendor/agent-download" className="text-sm font-semibold text-indigo-600">Download / connect app</Link></div>
    <p role="status" className={`text-sm ${stale ? "text-amber-700" : "text-emerald-700"}`}>
      {stale ? "Waiting for the shop app. Previously detected printers may be unavailable." : `${printers.length} printers detected · updates automatically`}
    </p>
    {!printers.length && <p className="text-sm text-zinc-500">Open PrintBuddy on the shop computer. Its printer list appears before setup; link the shop once to show it here. Printers must be installed in Windows or CUPS.</p>}
    <label className="block space-y-2 text-sm font-medium">Black-and-white printer
      <select aria-label="Black-and-white printer" className="w-full rounded-xl border p-3" value={blackWhite} onChange={e => setBlackWhite(e.target.value)}>{choices(blackWhite)}</select>
    </label>
    <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={same} onChange={e => setSame(e.target.checked)} />Use the same printer for color and black-and-white</label>
    {!same && <label className="block space-y-2 text-sm font-medium">Color printer
      <select aria-label="Color printer" className="w-full rounded-xl border p-3" value={colorPrinter} onChange={e => setColorPrinter(e.target.value)}>{choices(colorPrinter)}</select>
    </label>}
    <p className="text-xs text-zinc-500">Choose a color-capable printer for color jobs. Selecting it does not change which print options you offer customers.</p>
    <button onClick={save} disabled={busy || stale || !names.has(blackWhite) || (!same && !names.has(colorPrinter))} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save printer choices"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
