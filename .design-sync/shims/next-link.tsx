// design-sync preview shim for next/link — the real module reads
// process.env.__NEXT_* at import time, which throws outside Next's own
// build (see .design-sync/NOTES.md "Next.js runtime shims"). Renders a plain
// anchor; Next-only routing props are accepted and ignored so call sites
// don't need editing.
import * as React from 'react';

export interface LinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string | { pathname?: string };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch, replace, scroll, shallow, passHref, legacyBehavior, children, ...rest },
  ref,
) {
  const resolvedHref = typeof href === 'string' ? href : href?.pathname ?? '#';
  return (
    <a ref={ref} href={resolvedHref} {...rest}>
      {children}
    </a>
  );
});

export default Link;
