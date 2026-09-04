// POST /api/uploads/page-count — count pages in an already-uploaded file.
// Accepts { filePath, mime } (original) or { path, mime? } (new mobile app).
// If mime is missing we sniff by extension so callers can pass just `path`.

import { getSupabase } from "@/lib/supabase";
import { PDFDocument } from "pdf-lib";
import { NextRequest } from "next/server";

interface Body {
  filePath?: string;
  path?: string;
  mime?: string;
  mimeType?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const filePath = body.filePath ?? body.path;
  let mime = body.mime ?? body.mimeType;

  if (!filePath) {
    return Response.json({ error: "Missing filePath" }, { status: 400 });
  }

  // If the caller didn't send a mime, infer from extension.
  if (!mime) {
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (ext === "pdf") mime = "application/pdf";
    else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
    else if (ext === "png") mime = "image/png";
  }

  // Non-PDFs are one page.
  if (!mime?.includes("pdf")) {
    return Response.json({ pageCount: 1 });
  }

  const supabase = getSupabase();
  const { data: fileData, error } = await supabase.storage
    .from("documents")
    .download(filePath);

  if (error || !fileData) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const arrayBuf = await fileData.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuf, { ignoreEncryption: true });
    return Response.json({ pageCount: pdf.getPageCount() });
  } catch {
    return Response.json({ error: "Could not read PDF" }, { status: 422 });
  }
}
