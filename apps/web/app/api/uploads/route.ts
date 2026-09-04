import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";
import crypto from "crypto";

const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mime, size, shopId } = body as {
    mime: string;
    size: number;
    shopId: string;
  };

  if (!ALLOWED_MIMES.includes(mime)) {
    return Response.json(
      { error: `Unsupported file type. Allowed: ${ALLOWED_MIMES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!size || size > MAX_SIZE_BYTES) {
    return Response.json(
      { error: `File too large. Max ${MAX_SIZE_BYTES / 1024 / 1024} MB` },
      { status: 400 }
    );
  }

  const ext = mime === "application/pdf" ? "pdf" : mime === "image/jpeg" ? "jpg" : "png";
  const filePath = `${shopId}/${crypto.randomUUID()}.${ext}`;

  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    return Response.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }

  return Response.json({
    signedUrl: data.signedUrl,
    token: data.token,
    filePath,
  });
}
