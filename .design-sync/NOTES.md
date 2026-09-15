# PrintBuddy design-sync notes

- Repo shape: apps/web is a Next.js app, not a publishable package. No `dist/`,
  no `main`/`module`/`exports` in `apps/web/package.json` -> the converter runs
  in synth-entry mode straight from `apps/web/components/`. `.d.ts` contracts
  are therefore weaker (auto-extracted from source, not shipped types).
- `pkg: "web"` resolves via the npm workspaces symlink `node_modules/web ->
  apps/web` (created by `npm install` at repo root). `--node-modules` must
  point at the **repo root** `node_modules`, not `apps/web/node_modules`.
- `srcDir: "components"` is required — the default probe order
  (`src/`, `lib/`, `components/`) would otherwise pick `apps/web/lib/`
  (utility/Supabase-client code) since `apps/web/src/` doesn't exist but
  `apps/web/lib/` does.
- Excluded via `componentSrcMap`: `AdminDashboardShell` (imports
  `@/app/dashboard/DashboardClient`, outside `components/` — would drag the
  app-routing/data layer into the bundle).
- First-sync preview-authoring scope (user-approved, 2026-09-06): rich
  authored previews for ~20 core presentational components (Pill, StatusPill,
  Toggle, ToggleRow, TabBar, LoadingSpinner, EmptyState, ControlSection,
  KioskStatus, DocumentPreview, KioskQR, Modal, SegmentedControl, StatTile,
  SimpleBarChart, PrinterStatusPill, PrinterModeToggle, WalletChip,
  PrinterConfigModal, sign-up's `AuthComponent`). Everything else (admin
  dashboard screens, `VendorSidebar`/`VendorTopBar`, `QRScanner`, `NearbyMap`,
  `ui/demo.tsx`) ships functional but on the floor card — authorable
  incrementally on a later re-sync.
- Font: the app uses system-ui stack in `app/globals.css` for the scoped
  components. `app/page.tsx` loads Manrope/Plus Jakarta Sans via
  `next/font/google` for the marketing landing page only — not referenced by
  any synced component, so no font config was added. If a later re-sync pulls
  in `page.tsx`-adjacent pieces that use those fonts, revisit `extraFonts`.
- Router-coupled components (`VendorSidebar`, `VendorTopBar`, admin screens,
  `usePathname`/`useRouter`/`next/link` usage) have no Next.js router context
  in the preview harness — expect these to render as floor cards until/unless
  a router mock is authored via `cfg.provider`.

## Pre-build pipeline (must run before every `package-build.mjs`)

Three generated inputs aren't committed (regenerate every sync — see
`.gitignore`):

1. `node .design-sync/compile-css.mjs` — compiles `apps/web/app/globals.css`
   (Tailwind v4 CSS-first config, `@import "tailwindcss"` with no static
   dist) into real utility CSS at `apps/web/.ds-compiled-tailwind.css` via
   `postcss` + `@tailwindcss/postcss` (already hoisted to root
   `node_modules`). Without this, `cssEntry` scrapes the raw `@import`
   directive with zero utility classes and validate fails
   `[CSS_IMPORT_MISSING]`. `cfg.cssEntry` points at the compiled file.
2. `npx tsc -p apps/web/tsconfig.ds-types.json` — emits real `.d.ts` files to
   `apps/web/types/` from `components/**/*.tsx` source (declaration-only,
   `skipLibCheck`, `strict:false`). Without this, `findTypesRoot`'s default
   probe order (`build/ts`, `dist/types`, `types`, `lib`, `dist`) lands on
   `apps/web/lib/` (real utility source, zero `.d.ts` files inside), so
   `propsBodyFor` finds nothing and every component's `.d.ts` degrades to
   `{[key: string]: unknown}` — a silent, systemic fidelity loss (looked
   clean in the build log, only visible by opening an emitted `.d.ts`).
   Generating a `types/` folder makes `findTypesRoot` pick it correctly
   (checked before `lib`).
3. `node .design-sync/stage-src.mjs` — mirrors `apps/web/components/` to
   `apps/web/.ds-src-mirror/`, dropping the files listed below. `cfg.srcDir`
   points at the mirror, not the real `components/` dir.

Re-sync order: run all three, then `package-build.mjs`, `package-validate.mjs`.

## Bundle-poisoning files (excluded via stage-src.mjs, not componentSrcMap)

**`componentSrcMap: null` only hides a component's card — every `.tsx` under
`cfg.srcDir` still gets bundled into the one shared IIFE regardless.** True
exclusion requires keeping the file out of the mirrored source tree that
`stage-src.mjs` builds. Currently excluded:

- `dashboard/AdminDashboardShell.tsx` — imports `@/app/dashboard/DashboardClient`
  (outside `components/`), which has a **module-top-level**
  `process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID` read with no `typeof process`
  guard. Since the synth entry is one shared IIFE, this one import poisoned
  ALL 36 components at once (`[BUNDLE_EXPORT] 36/36 not a component` — every
  preview showed "ReferenceError: process is not defined"). Diagnose a
  repeat of this class of failure by grepping the built `_ds_bundle.js` for
  `process.env` and checking whether the match sits inside a function body
  (safe, lazy) or at module scope (`var x = process.env...` outside any
  function — poisons everything).
- `NearbyMap.tsx` — `export default function NearbyMap()` with **no named
  export**. The synth entry re-exports every mirrored file via
  `export * from './File.tsx'`, which silently drops default exports, so
  `NearbyMap` never reaches `window.PrintBuddy` (`[BUNDLE_EXPORT] 1/36 not a
  component: NearbyMap`) even though ts-morph's separate discovery pass
  still found it and generated its card metadata. Real fix if this component
  is wanted later: add a named export alongside the default in the real
  source (`export { NearbyMap }`) — a safe, additive change to the real app
  — or fork `lib/source-kit.mjs`'s entry generation to also emit
  `export { default as <Name> }` for default-only files (not attempted here;
  `lib/emit.mjs`/`lib/bundle.mjs` are off-limits to fork per the skill, but
  `source-kit.mjs` is fair game if this comes up again for another
  component).

## Next.js runtime shims (`.design-sync/shims/`)

`next/link` and `next/navigation`'s real modules read `process.env.__NEXT_*`
flags at **module top level** (Next's own bundler substitutes these via
DefinePlugin at build time; plain esbuild does not), which also poisoned the
entire shared bundle the same way as the Razorpay case above — 10 files
import one or the other (`VendorSidebar`, `VendorTopBar`, `PrinterConfigModal`,
`WalletChip`, `TabBar`, `ui/sign-up.tsx`, `PrinterStatusPill`, `AdminSidebar`,
`QRScanner`, `AdminNotAuthorised`). Fixed via `apps/web/tsconfig.ds-bundle.json`
(a design-sync-only tsconfig, never read by the real Next build) aliasing
`next/link` → `.design-sync/shims/next-link.tsx` (renders a plain `<a>`) and
`next/navigation` → `.design-sync/shims/next-navigation.ts` (no-op
`usePathname`/`useRouter`/`useSearchParams`) via esbuild's tsconfig-paths
resolution (already wired in `lib/bundle.mjs`'s `tsconfigPathsPlugin` once
`cfg.tsconfig` is set). `cfg.tsconfig` points at this file, not the app's
real `tsconfig.json` (which has no such aliases and would leave the crash
in place) — but it still needs its own copy of `@/*: ["./*"]` since it
doesn't use TypeScript's `extends` chain (the plugin only reads the given
file's own `compilerOptions.paths`, no `extends` resolution). Bonus: this
also fixes the *separate* "no App Router mounted" runtime crash these hooks
throw outside Next's real router context, so `VendorSidebar`/`VendorTopBar`/
`AdminSidebar` etc. render for real instead of floor-carding.

## Font substitution (accepted, not sourced)

`[FONT_MISSING]` flags "Cambria" and "Open Sans" — both are tertiary
fallback-stack entries (`app/globals.css`'s body font stack leads with
`system-ui, -apple-system, ...`; Tailwind's default serif stack includes
Cambria) that will essentially never be reached on any real device. Accepted
as system-font substitutes without sourcing files — not a brand font. If a
later re-sync pulls in `app/page.tsx`'s marketing-page pieces (Manrope /
Plus Jakarta Sans via `next/font/google`), revisit `extraFonts` for those —
they're real brand fonts, unlike Cambria/Open Sans.

## Session status (2026-09-06) — paused mid-run

First sync paused after the first verified batch, by user request (not an
error/crash — safe to resume any time).

- **Uploaded already** (12 components + shared base files: `_ds_bundle.js`,
  `_ds_bundle.css`, `styles.css`, `README.md`, `_vendor/**`):
  AdminAnalytics, AdminBankVerifications, AdminNotAuthorised, AdminPayouts,
  AdminPrinters, AdminSections, AdminSidebar, AdminVendors, VendorSidebar,
  VendorTopBar, QRScanner, DocumentUploadIcon. These were NOT scoped for
  authored previews — they render clean floor cards already (verified via
  the render check + contact sheets), so they shipped as-is.
- **`_ds_sync.json` was never uploaded** — deliberate. The project is
  un-anchored, which is the documented safe state for a paused/interrupted
  incremental sync: nothing rots silently, a future re-sync (or resuming
  this one) re-verifies everything cleanly rather than trusting a partial
  anchor.
- **Not yet authored** (currently floor cards in the local `ds-bundle/`, not
  yet uploaded): the ~23-component core scope approved earlier — Pill,
  StatusPill, Toggle, ToggleRow, TabBar, LoadingSpinner, EmptyState,
  ControlSection, KioskStatus, DocumentPreview, KioskQR, Modal,
  SegmentedControl, StatTile, SimpleBarChart, PrinterStatusPill,
  PrinterModeToggle, WalletChip, PrinterConfigModal, AuthComponent,
  GlassButton, TextLoop, Confetti. This is the remaining multi-hour work:
  author `.design-sync/previews/<Name>.tsx` for each (2-6 realistic stories),
  rebuild, capture, grade on the absolute rubric (styled/complete/plausible),
  push each verified batch.
- **To resume**: re-run the three pre-build steps (compile-css.mjs,
  `tsc -p apps/web/tsconfig.ds-types.json`, stage-src.mjs), then
  `package-build.mjs` + `package-validate.mjs` to confirm the bundle is
  still clean (0 `[BUNDLE_EXPORT]` errors) before resuming preview authoring.
  The plan (`finalize_plan`) from this session is gone with the session —
  a fresh `finalize_plan` call is needed to keep pushing batches next time.

## Re-sync risks

- No `cfg.provider` is configured. If Supabase-backed components
  (`WalletChip`, `PrinterStatusPill`, admin screens) are ever pulled into the
  authored-preview scope, they'll need mock data passed via props (they
  already accept `status`/`data` as props in most cases) rather than a global
  provider — check each component's own data-fetching before assuming a
  provider fixes it.
- `componentSrcMap.AdminDashboardShell: null` is the only structural
  exclusion; re-verify it's still needed if that component's imports change.
