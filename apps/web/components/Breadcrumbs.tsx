import Link from "next/link";

interface Crumb { label: string; href?: string }

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground px-4 py-2">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true">/</span>}
          {c.href
            ? <Link href={c.href} className="hover:text-foreground transition-colors">{c.label}</Link>
            : <span className="text-foreground font-medium">{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}
