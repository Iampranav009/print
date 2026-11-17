# HIMMER Brand Kit — Manrope

## Contents
- Logo lockups: horizontal and stacked, light/dark/white/black (SVG)
- Wordmark-only variants (SVG)
- Standalone symbol PNG, backgrounds and embedded-SVG wrapper
- Favicons 16–512 PNG + favicon.ico
- `brand-tokens.css` and `preview.html`

## Important production notes
1. **Manrope is referenced as a font family in the SVG files, but no font file is bundled.** Install/load Manrope (Google Fonts or self-host your properly licensed copy) before rendering SVG wordmarks. The browser preview imports Google Fonts and requires network access.
2. The supplied PNG horizontal logos are explicitly **fallback typography** rendered with DejaVu Sans, NOT Manrope. Use SVG with loaded Manrope for the approved typeface.
3. The original selected symbol was a raster image. `symbol-embedded.svg` and the lockup SVGs embed its PNG; they are not path-vector logos. For infinitely scalable print production, commission/vectorize a clean path recreation.
4. Colors: Emerald #00CE68, Forest #052E1B, White #FFFFFF, Black #000000.
5. The selected symbol is preserved; no colored letters, special cuts, or font effects.

## Suggested HTML
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/favicon-180.png">
<img src="/himmer-horizontal-light.svg" alt="HIMMER">
```

Brand imagery is a design concept, not trademark cleared.
