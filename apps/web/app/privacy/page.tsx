import { SiteHeader, SiteFooter } from "@/components/marketing/SiteChrome";
import { Breadcrumbs } from "@/components/Breadcrumbs";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How HIMMER handles your data — including document ephemerality, UPI payments, and your rights.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy — HIMMER",
    description: "How HIMMER handles your data — including document ephemerality, UPI payments, and your rights.",
    url: "/privacy",
    siteName: "HIMMER",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — HIMMER",
    description: "How HIMMER handles your data — including document ephemerality, UPI payments, and your rights.",
  },
};

export default function PrivacyPage() {
  return (
    <div className="hm-site" id="top">
      <SiteHeader />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
      <main id="main-content" className="hm-wrap hm-prose" style={{ maxWidth: 720, padding: "3rem 1.5rem 5rem" }}>
        <p className="hm-eyebrow"><span aria-hidden="true" />LEGAL</p>
        <h1 style={{ marginBottom: "0.5rem" }}>Privacy Policy</h1>
        <p style={{ color: "var(--hm-muted, #888)", marginBottom: "2.5rem" }}>
          Last updated: January 2025
        </p>

        <section style={{ marginBottom: "2rem" }}>
          <h2>What we collect</h2>
          <p>When you use HIMMER, we collect the minimum needed to fulfil your print order:</p>
          <ul>
            <li><strong>Phone number</strong> — used to identify your session and send order updates.</li>
            <li><strong>Uploaded documents</strong> — temporarily stored only long enough to process and dispatch your print job.</li>
            <li><strong>Print options and order details</strong> — pages, copies, colour settings, and the shop you printed at.</li>
            <li><strong>Payment information</strong> — processed by Razorpay. HIMMER never stores card or UPI credentials. See <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">Razorpay's Privacy Policy</a>.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Document ephemerality</h2>
          <p>
            Your uploaded documents are private. We store them in encrypted cloud storage using short-lived access links.
            Once your print job completes, your document is <strong>permanently deleted</strong> — both from our storage and from the
            print shop's device. We do not build a library of your past files.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>How we use your data</h2>
          <ul>
            <li>To process and track your print order end-to-end.</li>
            <li>To calculate and charge the correct price.</li>
            <li>To issue refunds if a print job fails.</li>
            <li>To improve reliability and diagnose errors.</li>
          </ul>
          <p>We do <strong>not</strong> sell your data to third parties. We do not use your documents for any purpose beyond fulfilling your order.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Data sharing</h2>
          <p>
            We share only what is necessary: your print job details are shared with the print shop you selected, and
            payment data flows through Razorpay. We do not share your data with advertisers or data brokers.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Your rights</h2>
          <p>
            You can request deletion of your account and associated order history at any time by contacting us. Because
            documents are deleted automatically on print completion, there is typically nothing to remove beyond order records.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about privacy? Reach us at <a href="mailto:privacy@himmer.in">privacy@himmer.in</a>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
