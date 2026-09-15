export interface PrinterRouting {
  os_printer_name: string | null;
  bw_os_printer_name?: string | null;
  color_os_printer_name?: string | null;
}

export function printerForJob(printer: PrinterRouting | null, color: boolean): string | null {
  if (!printer) return null;
  const selected = color ? printer.color_os_printer_name : printer.bw_os_printer_name;
  return selected?.trim() || printer.os_printer_name?.trim() || null;
}
