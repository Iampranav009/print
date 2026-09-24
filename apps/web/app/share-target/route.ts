import { NextRequest, NextResponse } from "next/server";

// Installed PWAs submit shares through the service worker, which stores the
// File objects locally before redirecting. This route is a safe fallback for
// browsers that send the POST without an active service worker controller.
export async function POST(request: NextRequest) {
  return NextResponse.redirect(new URL("/app/print?shared_error=1", request.url), 303);
}
