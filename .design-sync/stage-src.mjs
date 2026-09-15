// design-sync pre-build step: mirror apps/web/components into a build-only
// staging dir, dropping files whose imports reach outside components/ into
// app-internal code (Next/Supabase/Razorpay env reads that crash the shared
// IIFE bundle at load time — see .design-sync/NOTES.md "Bundle-poisoning
// files"). componentSrcMap can hide a component's CARD but not its FILE —
// every .tsx under cfg.srcDir is bundled into the one shared entry regardless
// — so exclusion has to happen at the file-copy step instead. This copies
// real, unmodified source; it excludes, never rewrites.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const webDir = resolve(import.meta.dirname, '..', 'apps', 'web');
const srcDir = join(webDir, 'components');
const outDir = join(webDir, '.ds-src-mirror');

// Package-relative (from apps/web/components/) paths to drop.
const EXCLUDE = new Set([
  'dashboard/AdminDashboardShell.tsx',
  // Default-only export ("export default function NearbyMap()", no named
  // export) — the synth entry re-exports every file via `export * from`,
  // which silently drops default exports, so it never reaches
  // window.PrintBuddy. See .design-sync/NOTES.md "Bundle-poisoning files".
  'NearbyMap.tsx',
]);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(srcDir, outDir, {
  recursive: true,
  filter: (src) => {
    const rel = relative(srcDir, src).split('\\').join('/');
    return !EXCLUDE.has(rel);
  },
});
console.log(`staged ${outDir} (excluded: ${[...EXCLUDE].join(', ')})`);
