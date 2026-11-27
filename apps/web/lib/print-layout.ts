import { PDFDocument, PDFName, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, degrees } from "pdf-lib";
import type { PrintOptions } from "@printbuddy/shared";

const sizes: Record<string, [number, number]> = { A4: [595.28,841.89], A3:[841.89,1190.55], A5:[419.53,595.28], Letter:[612,792], Legal:[612,1008] };

// Standard printer margins in PDF points (1 pt = 1/72 inch).
// 10 mm ≈ 28.35 pt — matches the default printable area of most inkjet/laser printers.
const MARGIN_PT = 28.35;

export interface SheetPlan {
  cols: number;
  rows: number;
  /** Pages are turned 90° to fill cells better, like a driver's 2-up/6-up on portrait paper. */
  rotate: boolean;
}

function fitScale(cellW: number, cellH: number, pageW: number, pageH: number, margin: number, rotate: boolean) {
  const [w, h] = rotate ? [pageH, pageW] : [pageW, pageH];
  return Math.min((cellW - margin * 2) / w, (cellH - margin * 2) / h);
}

/**
 * Picks the grid (cols × rows = count) and rotation that print the page largest,
 * which is what printer drivers do for 2/4/6/9 pages per sheet.
 * `cap` limits scale to 1 so small pages aren't turned for no visible gain.
 */
export function planSheet(sheetW: number, sheetH: number, pageW: number, pageH: number, count: number, margin: number, cap = false): SheetPlan {
  let best: SheetPlan & { scale: number } = { cols: 1, rows: count, rotate: false, scale: -1 };
  for (let cols = 1; cols <= count; cols++) {
    if (count % cols) continue;
    const rows = count / cols;
    for (const rotate of [false, true]) {
      const raw = fitScale(sheetW / cols, sheetH / rows, pageW, pageH, margin, rotate);
      const scale = cap ? Math.min(1, raw) : raw;
      if (scale > best.scale + 1e-6) best = { cols, rows, rotate, scale };
    }
  }
  return { cols: best.cols, rows: best.rows, rotate: best.rotate };
}

/**
 * Grid cell [col, row-from-top] for the nth page on a sheet. Turned pages are read after
 * rotating the sheet clockwise, so the order follows that view: left-to-right, top-to-bottom.
 */
export function slotCell(slot: number, plan: SheetPlan): [number, number] {
  if (!plan.rotate) return [slot % plan.cols, Math.floor(slot / plan.cols)];
  return [Math.floor(slot / plan.rows), plan.rows - 1 - (slot % plan.rows)];
}

/**
 * Bake page selection, orientation, scaling and N-up into a print-ready PDF.
 * The phone preview renders this same output, so what the customer sees is what prints.
 *
 * Scaling behaviour (mirrors what a real printer driver does):
 *  - "fit-to-page"   → always scale to fill the printable area (may enlarge)
 *  - "shrink-to-fit" → scale down oversized content, never enlarge
 *  - "none"          → same as shrink-to-fit, so oversized pages never overflow the sheet
 *
 * A 10 mm margin is reserved on every side (half per cell for N-up).
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
  if (indices.length === 0 || indices.some((i) => !Number.isInteger(i) || i < 0 || i >= source.getPageCount())) {
    throw new Error("Invalid page range");
  }
  if(options.reverse) indices.reverse();
  // Truly blank pages (no content stream) can't be embedded; give them an empty one.
  for (const i of indices) {
    const node = source.getPage(i).node;
    if (!node.Contents()) node.set(PDFName.of("Contents"), source.context.register(source.context.stream("")));
  }
  const output = await PDFDocument.create();
  const embeddedPages = await output.embedPages(indices.map(i=>source.getPage(i)));
  // Embedding drops the page's /Rotate flag (common in scans), so carry it and draw pages as displayed.
  const embedded = embeddedPages.map((page, n) => {
    const turn = ((source.getPage(indices[n]).getRotation().angle % 360) + 360) % 360;
    const sideways = turn % 180 === 90;
    return { page, turn, width: sideways ? page.height : page.width, height: sideways ? page.width : page.height };
  });
  const base = sizes[options.paper];
  if(!base) throw new Error("Unsupported paper size");
  const [width,height] = options.orientation === "landscape" ? [base[1],base[0]] : base;
  const count = options.numberUp || 1;
  const margin = count === 1 ? MARGIN_PT : MARGIN_PT / 2;
  const capped = count === 1 && options.scaling !== "fit-to-page";

  for(let offset=0;offset<embedded.length;offset+=count) {
    const sheet = output.addPage([width,height]);
    // The first page on the sheet decides the grid; others rotate individually if that fits them better.
    const lead = embedded[offset];
    const plan = planSheet(width, height, lead.width, lead.height, count, margin, capped);
    const cellW = width / plan.cols, cellH = height / plan.rows;

    for(let slot=0;slot<count && offset+slot<embedded.length;slot++) {
      const page=embedded[offset+slot];
      const [col, row] = slotCell(slot, plan);
      const x = col * cellW, y = height - (row + 1) * cellH;

      const uprightFit = fitScale(cellW, cellH, page.width, page.height, margin, false);
      const turnedFit = fitScale(cellW, cellH, page.width, page.height, margin, true);
      const shouldRotate = capped
        ? Math.min(1, turnedFit) > Math.min(1, uprightFit) + 1e-6
        : turnedFit > uprightFit + 1e-6;
      const fit = shouldRotate ? turnedFit : uprightFit;
      const scale = capped ? Math.min(1, fit) : fit;
      const drawW = (shouldRotate ? page.height : page.width) * scale;
      const drawH = (shouldRotate ? page.width : page.height) * scale;

      // Centre the scaled content within the cell's printable area
      const centerX = x + margin + (cellW - margin * 2 - drawW) / 2;
      const centerY = y + margin + (cellH - margin * 2 - drawH) / 2;

      // /Rotate turns the page clockwise for display; pdf-lib rotates counter-clockwise about (x, y).
      const angle = (360 - page.turn + (shouldRotate ? 90 : 0)) % 360;
      const rawW = page.page.width * scale, rawH = page.page.height * scale;
      const [dx, dy] = angle === 90 ? [rawH, 0] : angle === 180 ? [rawW, rawH] : angle === 270 ? [0, rawW] : [0, 0];

      sheet.pushOperators(pushGraphicsState(),rectangle(x,y,cellW,cellH),clip(),endPath());
      sheet.drawPage(page.page, { x: centerX + dx, y: centerY + dy, xScale: scale, yScale: scale, rotate: degrees(angle) });
      sheet.pushOperators(popGraphicsState());
    }
  }
  return output.save();
}
