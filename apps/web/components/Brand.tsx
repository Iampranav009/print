import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" aria-label="HIMMER home" className={`inline-flex shrink-0 items-center gap-2.5 ${light ? "text-white" : "text-label"}`}>
    <svg width="32" height="36" viewBox="0 0 32 36" fill="none" aria-hidden="true"><path d="M3 3h8v12h10V3h8v30h-8V22H11v11H3V3Z" fill="currentColor"/><path d="M21 3h8v8l-8-8Z" fill="#8acba1"/></svg>
    <span className="text-xl font-extrabold tracking-[-.045em]">HIMMER</span>
  </Link>;
}
