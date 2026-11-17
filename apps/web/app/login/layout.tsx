import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to HIMMER to upload documents, track print jobs, and manage your orders.",
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Sign In — HIMMER",
    description: "Sign in to HIMMER to upload documents, track print jobs, and manage your orders.",
    url: "/login",
    siteName: "HIMMER",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In — HIMMER",
    description: "Sign in to HIMMER to upload documents, track print jobs, and manage your orders.",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
