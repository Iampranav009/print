import { PDFDocument, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } from "pdf-lib";
import type { PrintOptions } from "@printbuddy/shared";

const sizes: Record<string, [number, number]> = { A4: [595.28,841.89], A3:[841.89,1190.55], A5:[419.53,595.28], Letter:[612,792], Legal:[612,1008] };

/** Bake page selection, orientation, scaling and N-up into a print-ready PDF. */
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
  for(let offset=0;offset<embedded.length;offset+=count) {
    const sheet = output.addPage([width,height]);
    for(let slot=0;slot<count && offset+slot<embedded.length;slot++) {
      const page=embedded[offset+slot];
      const cellW=width/cols,cellH=height/rows;
      const x=(slot%cols)*cellW, y=height-(Math.floor(slot/cols)+1)*cellH;
      const fit=Math.min(cellW/page.width,cellH/page.height);
      const scale=count>1 || options.scaling === "fit-to-page" ? fit : options.scaling === "shrink-to-fit" ? Math.min(1,fit) : 1;
      sheet.pushOperators(pushGraphicsState(),rectangle(x,y,cellW,cellH),clip(),endPath());
      sheet.drawPage(page,{x:x+(cellW-page.width*scale)/2,y:y+(cellH-page.height*scale)/2,xScale:scale,yScale:scale});
      sheet.pushOperators(popGraphicsState());
    }
  }
  return output.save();
}
