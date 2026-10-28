import { AlertTriangle } from "lucide-react";

export function JobErrorLog({ reason }: { reason?: string | null }) {
  if (!reason) return <span className="text-xs text-zinc-400">—</span>;
  return (
    <details className="group max-w-md">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        View error
      </summary>
      <pre className="mt-2 max-h-48 min-w-72 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-100">
        {reason}
      </pre>
    </details>
  );
}
