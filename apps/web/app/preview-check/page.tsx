"use client";
import { useEffect, useState } from "react";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import type { PrintOptions } from "@printbuddy/shared";
import { DocumentPreview } from "@/components/DocumentPreview";
import { dominantOrientation, imageToJpeg, isPdfFile } from "@/lib/print-files";

// Dev check for the print preview: a 9-page sample (page 4 landscape) and the layout controls.
export default function Check() {
  const [file, setFile] = useState<File | null>(null);
  const [orientation, setOrientation] = useState<PrintOptions["orientation"]>("portrait");
  const [numberUp, setNumberUp] = useState(1);
  const [color, setColor] = useState(true);

  useEffect(() => {
    void (async () => {
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      for (let i = 0; i < 9; i++) {
        const [w, h] = i === 3 ? [842, 595] : [595, 842];
        const page = pdf.addPage([w, h]);
        page.drawRectangle({ x: 20, y: 20, width: w - 40, height: h - 40, borderWidth: 4, borderColor: rgb(0.05, 0.51, 0.12) });
        page.drawText(`Page ${i + 1}`, { x: 60, y: h - 120, size: 64, font });
        page.drawRectangle({ x: 60, y: 80, width: w - 120, height: 60, color: rgb(0.9, 0.2, 0.2) });
      }
      // Page 10: drawn sideways with /Rotate 90, like many scans. Must show upright, landscape.
      const scan = pdf.addPage([595, 842]);
      scan.drawText("Page 10 (scan)", { x: 120, y: 60, size: 48, font, rotate: degrees(90) });
      scan.setRotation(degrees(90));
      setFile(new File([new Uint8Array(await pdf.save())], "Sample.pdf", { type: "application/pdf" }));
    })();
  }, []);

  const options: PrintOptions = {
    copies: 1, color, orientation, paper: "A4", duplex: false, duplex_edge: "long", pageRange: null,
    numberUp, collate: true, quality: "normal", mediaType: "plain", reverse: false, scaling: "none", finishings: [],
  };

  // Same conversion as the print page: images → upright JPEG pages, then auto orientation.
  async function loadFiles(picked: File[]) {
    const pdf = await PDFDocument.create();
    for (const f of picked) {
      if (isPdfFile(f)) {
        const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
        (await pdf.copyPages(src, src.getPageIndices())).forEach((p) => pdf.addPage(p));
      } else {
        const photo = await imageToJpeg(f);
        pdf.addPage([photo.width, photo.height]).drawImage(await pdf.embedJpg(photo.bytes), { x: 0, y: 0, width: photo.width, height: photo.height });
      }
    }
    setOrientation(dominantOrientation(pdf));
    setFile(new File([new Uint8Array(await pdf.save())], picked[0].name, { type: "application/pdf" }));
  }

  return (
    <main style={{ width: 390, margin: "30px auto", padding: 20, display: "grid", gap: 12 }}>
      <input type="file" multiple accept="application/pdf,.pdf,image/*,.heic,.heif" onChange={(e) => void loadFiles(Array.from(e.target.files ?? []))} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setOrientation((o) => (o === "portrait" ? "landscape" : "portrait"))}>Orientation: {orientation}</button>
        <button onClick={() => setColor((c) => !c)}>{color ? "Colour" : "B&W"}</button>
        {[1, 2, 4, 6, 9].map((n) => (
          <button key={n} onClick={() => setNumberUp(n)} aria-pressed={numberUp === n}>{n}-up</button>
        ))}
      </div>
      {file && <DocumentPreview pdf={file} options={options} label="Sample.pdf" />}
    </main>
  );
}
