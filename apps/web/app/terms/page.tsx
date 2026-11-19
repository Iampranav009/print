import { SiteHeader, SiteFooter } from "@/components/marketing/SiteChrome";
import { Breadcrumbs } from "@/components/Breadcrumbs";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "HIMMER's terms for customers and shop partners — pricing, refunds, acceptable use, and governing law.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service — HIMMER",
    description: "HIMMER's terms for customers and shop partners — pricing, refunds, acceptable use, and governing law.",
    url: "/terms",
    siteName: "HIMMER",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service — HIMMER",
    description: "HIMMER's terms for customers and shop partners — pricing, refunds, acceptable use, and governing law.",
  },
};

export default function TermsPage() {
  return (
    <div className="hm-site" id="top">
      <SiteHeader />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Terms of Service" }]} />
      <main id="main-content" className="hm-wrap hm-prose" style={{ maxWidth: 720, padding: "3rem 1.5rem 5rem" }}>
        <p className="hm-eyebrow"><span aria-hidden="true" />LEGAL</p>
        <h1 style={{ marginBottom: "0.5rem" }}>Terms of Service</h1>
        <p style={{ color: "var(--hm-muted, #888)", marginBottom: "2.5rem" }}>
          Last updated: January 2025
        </p>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Acceptable use</h2>
          <p>
            HIMMER may only be used to print lawful documents. You must not upload material that is illegal,
            infringes copyright, or violates the rights of others. We reserve the right to cancel orders that
            violate this policy without refund.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Pricing and payment</h2>
          <p>
            The price shown before you confirm payment is the final price. It is calculated from your document,
            your selected print options, and the shop's rates. Prices are locked at checkout — there are no
            surcharges added after payment.
          </p>
          <p>
            Payments are processed by Cashfree Payments. By completing a payment you agree to
            <a href="https://www.cashfree.com/tnc/" target="_blank" rel="noopener noreferrer"> Cashfree's Terms</a>.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Refund policy</h2>
          <p>
            If your print job cannot be completed due to a printer error, hardware failure, or inability to
            dispatch the job, you are entitled to a full refund. Refunds are issued to your original payment
            method via Cashfree, typically within 5–7 business days.
          </p>
          <p>
            Refunds are not issued for jobs that printed successfully but where you are dissatisfied with
            the physical print quality, as print output is handled by the shop's own equipment. If you experience
            a quality issue, contact the shop directly.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Print shop responsibility</h2>
          <p>
            HIMMER connects customers with independently operated print shops. Each shop is responsible for
            maintaining its printers, setting its own rates, and ensuring a reasonable level of service.
            HIMMER is not liable for the actions or omissions of individual shop operators beyond facilitating
            the refund process for failed jobs.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Limitation of liability</h2>
          <p>
            HIMMER's liability is limited to the amount you paid for the specific order in dispute. We are not
            liable for indirect or consequential losses arising from use of the platform.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Changes to these terms</h2>
          <p>
            We may update these terms. Continued use of the platform after a posted change constitutes acceptance.
            Material changes will be communicated through the app.
          </p>
        </section>

        <section>
          <h2>Governing law</h2>
          <p>
            These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of
            courts in India.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
