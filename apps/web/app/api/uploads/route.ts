// POST /api/uploads — mint a Supabase signed upload URL for a customer's
// file. Accepts either the original field names (mime, size) or the newer
// ones the mobile app sends (mimeType, fileSize, fileName). Returns both
// `filePath`/`path` and `mime` so existing and current callers all work.

import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";
import crypto from "crypto";

const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

interface UploadBody {
  mime?: string;
  mimeType?: string;
  size?: number;
  fileSize?: number;
  shopId?: string;
  fileName?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as UploadBody;

  // Accept both { mime, size } and { mimeType, fileSize } — Anti Gravity's
  // rewrite of the print page uses the second set.
  const mime = body.mime ?? body.mimeType;
  const size = body.size ?? body.fileSize;
  const shopId = body.shopId?.trim() || "virtual";

  if (!mime || !ALLOWED_MIMES.includes(mime)) {
    return Response.json(
      {
        error: `Unsupported file type${mime ? ` "${mime}"` : ""}. Allowed: PDF, JPG, PNG.`,
      },
      { status: 400 }
    );
  }

  if (typeof size !== "number" || size <= 0) {
    return Response.json(
      { error: "File size is required" },
      { status: 400 }
    );
  }

  if (size > MAX_SIZE_BYTES) {
    return Response.json(
      { error: `File too large. Max ${MAX_SIZE_BYTES / 1024 / 1024} MB.` },
      { status: 400 }
    );
  }

  const ext =
    mime === "application/pdf" ? "pdf" : mime === "image/jpeg" ? "jpg" : "png";
  const filePath = `${shopId}/${crypto.randomUUID()}.${ext}`;

  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    console.error("[uploads] createSignedUploadUrl failed", error);
    return Response.json(
      { error: "Failed to create upload URL", detail: error?.message },
      { status: 500 }
    );
  }

  return Response.json({
    signedUrl: data.signedUrl,
    token: data.token,
    // Both field names for back-compat with older callers.
    filePath,
    path: filePath,
    mime,
  });
}
