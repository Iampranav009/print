import { PDFDocument, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, degrees } from "pdf-lib";
import type { PrintOptions } from "@printbuddy/shared";

const sizes: Record<string, [number, number]> = { A4: [595.28,841.89], A3:[841.89,1190.55], A5:[419.53,595.28], Letter:[612,792], Legal:[612,1008] };

// Standard printer margins in PDF points (1 pt = 1/72 inch).
// 10 mm ≈ 28.35 pt — matches the default printable area of most inkjet/laser printers.
const MARGIN_PT = 28.35;

/**
 * Bake page selection, orientation, scaling and N-up into a print-ready PDF.
 *
 * Scaling behaviour (mirrors what a real printer driver does):
 *  - "fit-to-page"   → always scale to fill the printable area (may enlarge)
 *  - "shrink-to-fit" → scale down oversized content, never enlarge
 *  - "none"          → same as shrink-to-fit — shrink if content overflows the
 *                      printable area, otherwise keep native size and centre it.
 *                      This prevents the "extreme zoom" bug where content whose
 *                      PDF dimensions are declared in screen pixels (e.g. a
 *                      1920 × 1080 pt raster image) overflows an A4 page entirely.
 *
 * A 10 mm margin is always reserved on every side so output matches what a
 * physical printer produces.
 */
export async function preparePrintPdf(bytes: Uint8Array, options: PrintOptions): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes);
  const selected = new Set<number>();
  if (options.pageRange) {
    for (const part of options.pageRange.split(",")) {
      const [first,last] = part.trim().split("-").map(Number);
      for(let n=first;n<=(last ?? first);n++) selected.add(n-1);
    }
  } else source.getPageIndices().forEach(n=>selected.add(n));
  const indices = [...selected].sort((a,b)=>a-b);
  if(options.reverse) indices.reverse();
  const output = await PDFDocument.create();
  const embedded = await output.embedPages(indices.map(i=>source.getPage(i)));
  const base = sizes[options.paper];
  if(!base) throw new Error("Unsupported paper size");
  const [width,height] = options.orientation === "landscape" ? [base[1],base[0]] : base;
  const count = options.numberUp;
  const cols = count === 1 ? 1 : count === 9 ? 3 : 2;
  const rows = Math.ceil(count/cols);

  // For N-up, halve the margin so each sub-cell keeps a sensible inner border
  // while the outer page edge still has ~MARGIN_PT of whitespace.
  const margin = count === 1 ? MARGIN_PT : MARGIN_PT / 2;

  for(let offset=0;offset<embedded.length;offset+=count) {
    const sheet = output.addPage([width,height]);
    for(let slot=0;slot<count && offset+slot<embedded.length;slot++) {
      const page=embedded[offset+slot];

      // Full grid cell (no margins yet)
      const cellW=width/cols,cellH=height/rows;
      const x=(slot%cols)*cellW, y=height-(Math.floor(slot/cols)+1)*cellH;

      // Printable area inside this cell after applying margins on all 4 sides
      const printW = cellW - margin * 2;
      const printH = cellH - margin * 2;

      const shouldRotate = (cellW > cellH) !== (page.width > page.height);
      const rotW = shouldRotate ? page.height : page.width;
      const rotH = shouldRotate ? page.width : page.height;

      // Scale factor required to exactly fill the printable area
      const fit = Math.min(printW / rotW, printH / rotH);

      // Pick the actual scale based on the user's scaling preference:
      //   fit-to-page   → always fill (fit)
      //   shrink-to-fit → only shrink, never enlarge (min(1, fit))
      //   none          → shrink-to-fit behaviour — prevents overflow/zoom bug
      const scale =
        count > 1 || options.scaling === "fit-to-page"
          ? fit
          : Math.min(1, fit); // default: shrink-to-fit for both "none" and "shrink-to-fit"

      const drawW = rotW * scale;
      const drawH = rotH * scale;

      // Centre the scaled content within the printable area
      const centerX = x + margin + (printW - drawW) / 2;
      const centerY = y + margin + (printH - drawH) / 2;

      sheet.pushOperators(pushGraphicsState(),rectangle(x,y,cellW,cellH),clip(),endPath());
      if (shouldRotate) {
        sheet.drawPage(page, {
          x: centerX + page.height * scale,
          y: centerY,
          xScale: scale,
          yScale: scale,
          rotate: degrees(90),
        });
      } else {
        sheet.drawPage(page, {
          x: centerX,
          y: centerY,
          xScale: scale,
          yScale: scale,
        });
      }
      sheet.pushOperators(popGraphicsState());
    }
  }
  return output.save();
}
