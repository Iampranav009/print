import { headers } from "next/headers";
import { PrinterClient } from "./printer-client";

export default async function VendorPrinterPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";

  let initialData = {
    shop: { id: "", name: "Shop", virtual_mode: true },
    printer: null,
    status: {
      mode: "test" as "test" | "real",
      online: true,
      last_seen_at: null as string | null,
      heartbeat_window_seconds: 90,
    },
  };

  try {
    const res = await fetch(`${protocol}://${host}/api/vendor/printer`, {
      headers: {
        cookie: headersList.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      initialData = {
        shop: data.shop ?? initialData.shop,
        printer: data.printer ?? null,
        status: {
          mode: data.status?.mode ?? (data.shop?.virtual_mode ? "test" : "real"),
          online: !!data.status?.online,
          last_seen_at: data.status?.last_seen_at ?? null,
          heartbeat_window_seconds: data.status?.heartbeat_window_seconds ?? 90,
        },
      };
    }
  } catch {
    // Network / build fallback
  }

  return <PrinterClient initialData={initialData} />;
}
