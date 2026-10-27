import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Manrope } from "next/font/google";
import { RegisterSW } from "@/app/components/register-sw";
import "./globals.css";
import "./marketing.css";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-himmer" });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://himmer.vercel.app";

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
    icon: "/icon.svg",
    apple: "/icon-maskable.svg",
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
        <link rel="preconnect" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://api.razorpay.com" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <RegisterSW />
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
