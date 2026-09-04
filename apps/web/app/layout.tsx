import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { RegisterSW } from "@/app/components/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrintBuddy",
  description: "Self-serve printing — scan, upload, pay, print.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <RegisterSW />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
