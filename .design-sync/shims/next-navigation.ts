// design-sync preview shim for next/navigation — the real module reads
// process.env.__NEXT_* at import time, which throws outside Next's own
// build, and its hooks throw without a mounted App Router regardless (see
// .design-sync/NOTES.md "Next.js runtime shims"). Safe no-op fallbacks so
// nav-aware components render instead of crashing or floor-carding.
export function usePathname(): string {
  return '/';
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export interface ShimRouter {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
}

export function useRouter(): ShimRouter {
  return {
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  };
}
