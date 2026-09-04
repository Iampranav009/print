import { getSupabase } from "@/lib/supabase";
import { PDFDocument } from "pdf-lib";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { filePath, mime } = (await req.json()) as {
    filePath: string;
    mime: string;
  };

  if (!filePath) {
    return Response.json({ error: "Missing filePath" }, { status: 400 });
  }

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
