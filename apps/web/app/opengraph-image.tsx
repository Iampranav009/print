import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#1a3a2a",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <div style={{ color: "#ffffff", fontSize: 88, fontWeight: 700, letterSpacing: "-4px", lineHeight: 1 }}>
        HIMMER
      </div>
      <div style={{ color: "#a3c4a8", fontSize: 34, letterSpacing: "-0.5px" }}>
        From your phone. To the page.
      </div>
    </div>,
    size
  );
}
