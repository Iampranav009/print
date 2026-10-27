import { printerForJob, type PrinterRouting } from "./printer-routing";

export interface DiscoveredPrinter {
  name: string;
  driver?: string | null;
  isDefault?: boolean;
  available?: boolean;
  status?: string;
}

export function printerReady(printer: (PrinterRouting & { color_enabled?: boolean }) | null, discovered: DiscoveredPrinter[]): boolean {
  const available = new Set(discovered.filter(p => p.available !== false).map(p => p.name));
  const bw = printerForJob(printer, false);
  const color = printerForJob(printer, true);
  return !!bw && available.has(bw) && (!printer?.color_enabled || (!!color && available.has(color)));
}
