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

## Re-sync risks

- No `cfg.provider` is configured. If Supabase-backed components
  (`WalletChip`, `PrinterStatusPill`, admin screens) are ever pulled into the
  authored-preview scope, they'll need mock data passed via props (they
  already accept `status`/`data` as props in most cases) rather than a global
  provider — check each component's own data-fetching before assuming a
  provider fixes it.
- `componentSrcMap.AdminDashboardShell: null` is the only structural
  exclusion; re-verify it's still needed if that component's imports change.
