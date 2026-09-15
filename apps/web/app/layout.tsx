import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { RegisterSW } from "@/app/components/register-sw";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://printbuddy.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PrintBuddy — Smart Print Software & Wireless Printing ATM Machine",
    template: "%s | PrintBuddy",
  },
  description:
    "PrintBuddy is revolutionary digital software that converts any shop printer into an automated wireless printing machine and self-serve printing ATM machine. Scan QR, upload files, pay via UPI, and print instantly in Yotmal and across India.",
  applicationName: "PrintBuddy",
  keywords: [
    "Yotmal",
    "Yotmal xerox shop",
    "Yavatmal print software",
    "digital software",
    "Print Buddy",
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
  authors: [{ name: "PrintBuddy", url: siteUrl }],
  creator: "PrintBuddy",
  publisher: "PrintBuddy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PrintBuddy — Smart Print Software & Wireless Printing ATM Machine",
    description:
      "Transform any printer into a wireless printing machine and automated printing ATM machine. Scan QR, pay via UPI, and print. Serving Yotmal and print shops across India.",
    url: siteUrl,
    siteName: "PrintBuddy",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrintBuddy — Smart Print Software & Wireless Printing ATM Machine",
    description:
      "Transform standard printers into self-service wireless printing machines and printing vending machines. Live in Yotmal and throughout India.",
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
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0C831F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <RegisterSW />
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
