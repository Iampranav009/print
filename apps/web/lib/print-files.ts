import type { PDFDocument } from "pdf-lib";

const HEIC = /\.(heic|heif)$/i;

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** Apple photos (HEIC) often arrive with an empty type on Android, so check the name too. */
export function isHeicFile(file: File) {
  return /^image\/hei[cf]/.test(file.type) || HEIC.test(file.name);
}

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || isHeicFile(file);
}

/** Longest edge kept for photos: about 340 dpi on A4, sharp for print and light to upload. */
const MAX_EDGE_PX = 4000;

/**
 * Turns any image the phone can open (JPG, PNG, WebP, GIF, AVIF, BMP, HEIC) into a JPEG,
 * upright per the camera's rotation tag and on white, so transparent images print cleanly.
 */
export async function imageToJpeg(file: File): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    if (isHeicFile(file)) {
      const { heicTo } = await import("heic-to/next");
      bitmap = await heicTo({ blob: file, type: "bitmap", options: { imageOrientation: "from-image" } });
    } else {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    }
  } catch {
    throw new Error(`Can't open "${file.name}". Try saving it as a JPG or PDF.`);
  }

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the image");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error(`Can't open "${file.name}".`);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
}

/** "landscape" when most pages are wider than tall as displayed (honouring each page's rotation). */
export function dominantOrientation(pdf: PDFDocument): "portrait" | "landscape" {
  const pages = pdf.getPages();
  const wide = pages.filter((page) => {
    const { width, height } = page.getSize();
    const sideways = page.getRotation().angle % 180 !== 0;
    return sideways ? height > width : width > height;
  }).length;
  return wide > pages.length / 2 ? "landscape" : "portrait";
}
