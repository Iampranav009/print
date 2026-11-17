import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Print a Document",
  description: "Upload your document, choose print settings, pay via UPI, and collect from a nearby shop.",
  alternates: { canonical: "/app/print" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Print a Document — HIMMER",
    description: "Upload your document, choose print settings, pay via UPI, and collect from a nearby shop.",
    url: "/app/print",
    siteName: "HIMMER",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Print a Document — HIMMER",
    description: "Upload your document, choose print settings, pay via UPI, and collect from a nearby shop.",
  },
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
