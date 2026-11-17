import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nearby Print Shops",
  description: "Find HIMMER-connected print shops near you. Upload a document and print in minutes.",
  alternates: { canonical: "/app/nearby" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Nearby Print Shops — HIMMER",
    description: "Find HIMMER-connected print shops near you.",
    url: "/app/nearby",
    siteName: "HIMMER",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nearby Print Shops — HIMMER",
    description: "Find HIMMER-connected print shops near you.",
  },
};

export default function NearbyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
