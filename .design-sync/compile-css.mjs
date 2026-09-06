// One-off: compile apps/web/app/globals.css (Tailwind v4 CSS-first config, no
// static dist) into real utility CSS for design-sync's cfg.cssEntry. Tailwind
// v4 has no build step of its own in this repo (Next's dev/prod pipeline
// compiles it on the fly), so design-sync's converter would otherwise scrape
// the raw `@import "tailwindcss";` source, which has no utility classes in it.
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const webDir = resolve(import.meta.dirname, '..', 'apps', 'web');
const inputPath = resolve(webDir, 'app', 'globals.css');
const outputPath = resolve(webDir, '.ds-compiled-tailwind.css');

const css = readFileSync(inputPath, 'utf8');
const result = await postcss([tailwindcss({ base: webDir })]).process(css, {
  from: inputPath,
  to: outputPath,
});
writeFileSync(outputPath, result.css);
console.log(`wrote ${outputPath} (${(result.css.length / 1024).toFixed(1)} KB)`);
