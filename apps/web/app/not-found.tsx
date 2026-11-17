import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteChrome";

export const metadata = { title: "Page not found — HIMMER" };

export default function NotFound() {
  return (
    <div className="hm-site" id="top">
      <SiteHeader />
      <main
        id="main-content"
        className="hm-wrap"
        style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 1.5rem", textAlign: "center" }}
      >
        <p className="hm-eyebrow" style={{ marginBottom: "1rem" }}><span aria-hidden="true" />404</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: "1rem" }}>Page not found</h1>
        <p style={{ color: "var(--hm-muted, #888)", maxWidth: 400, marginBottom: "2rem" }}>
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link href="/" className="hm-button">Go home</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
