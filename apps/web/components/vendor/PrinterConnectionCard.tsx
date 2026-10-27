"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Connection {
  status: { online: boolean; agent_connected: boolean; mode: string };
  printer: { os_printer_name: string | null; bw_os_printer_name: string | null; color_os_printer_name: string | null } | null;
  discovered_printers: Array<{ name: string; available?: boolean }>;
}

export function PrinterConnectionCard() {
  const [data, setData] = useState<Connection | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let pending = false;
    const controller = new AbortController();
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch("/api/vendor/printer", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Status unavailable");
        const next: Connection = await response.json();
        if (active) { setData(next); setFailed(false); }
      } catch { if (active) setFailed(true); }
      finally { pending = false; }
    }
    void refresh();
    const timer = setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => { active = false; controller.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const name = data?.printer?.bw_os_printer_name || data?.printer?.os_printer_name;
  const connected = !failed && data?.status.agent_connected;
  const ready = connected && data?.status.online && data.status.mode !== "test";
  const label = failed ? "Connection check unavailable" : !data ? "Checking connection…" : !connected ? "Shop app offline" : !name ? "Choose a printer" : data.status.mode === "test" ? "Test mode — printing disabled" : ready ? "Printer ready" : "Printer unavailable";
  return <Link href="/vendor/printer" className="mx-3 my-3 block rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs" aria-label="Printer connection and settings">
    <p className="font-semibold" role="status"><span className={`mr-2 inline-block h-2 w-2 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"}`} />{label}</p>
    <p className="mt-2 break-words text-zinc-700">{name || "Select your shop printer"}</p>
    {data?.printer?.color_os_printer_name && data.printer.color_os_printer_name !== name && <p className="mt-1 break-words text-zinc-500">Color: {data.printer.color_os_printer_name}</p>}
    {connected && <p className="mt-1 text-zinc-500">{data?.discovered_printers.length ?? 0} installed printers · Manage →</p>}
  </Link>;
}
