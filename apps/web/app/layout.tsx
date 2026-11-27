import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Manrope } from "next/font/google";
import { RegisterSW } from "@/app/components/register-sw";
import { JsonLd } from "@/components/seo/JsonLd";
import { orgSchema } from "@/components/seo/schemas";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./marketing.css";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-himmer" });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.himmer.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "HIMMER — Effortless Printing Software",
    template: "%s | HIMMER",
  },
  description:
    "HIMMER makes everyday printing effortless. Scan a QR code, upload documents, pay securely via UPI, and print from connected local shops across India.",
  applicationName: "HIMMER",
  keywords: [
    "Yotmal",
    "Yotmal xerox shop",
    "Yavatmal print software",
    "digital software",
    "HIMMER",
    "easy printing software",
    "effortless printing software",
    "Print Software",
    "wireless printing machine",
    "printing ATM machine",
    "printing vending machine",
    "self-serve printing kiosk",
    "automatic xerox machine",
    "UPI document printing",
    "online print shop software",
    "smart counter printer",
    "touchless printing solution",
    "cloud print agent India",
  ],
  authors: [{ name: "HIMMER", url: siteUrl }],
  creator: "HIMMER",
  publisher: "HIMMER",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "HIMMER — Effortless Printing Software",
    description:
      "Printing, made effortless. Scan a QR code, upload documents, pay via UPI, and print through connected local shops across India.",
    url: siteUrl,
    siteName: "HIMMER",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HIMMER — Effortless Printing Software",
    description:
      "Printing, made effortless. Upload, pay, and print securely through connected local shops.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/favicon-180.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0C831F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased font-sans`}>
      <head>
        <link rel="preconnect" href="https://sdk.cashfree.com" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <JsonLd schema={orgSchema()} />
        <Analytics />
        <RegisterSW />
        <Script
          src="https://sdk.cashfree.com/js/v3/cashfree.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
