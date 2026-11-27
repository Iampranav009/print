import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteChrome";
import { Breadcrumbs } from "@/components/Breadcrumbs";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The simple rules for using HIMMER to print at local shops: what you can print, pricing, payments and refunds.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms & Conditions — HIMMER",
    description: "The simple rules for using HIMMER to print at local shops: what you can print, pricing, payments and refunds.",
    url: "/terms",
    siteName: "HIMMER",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms & Conditions — HIMMER",
    description: "The simple rules for using HIMMER to print at local shops: what you can print, pricing, payments and refunds.",
  },
};

export default function TermsPage() {
  return (
    <div className="hm-site" id="top">
      <SiteHeader />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Terms & Conditions" }]} />
      <main id="main-content" className="hm-wrap hm-prose" style={{ maxWidth: 720, padding: "3rem 1.5rem 5rem" }}>
        <p className="hm-eyebrow"><span aria-hidden="true" />LEGAL</p>
        <h1 style={{ marginBottom: "0.5rem" }}>Terms &amp; Conditions</h1>
        <p style={{ color: "var(--hm-muted, #888)", marginBottom: "2.5rem" }}>Last updated: 27 November 2026</p>

        <section style={{ marginBottom: "2rem" }}>
          <h2>What HIMMER is</h2>
          <p>
            HIMMER lets you send a document from your phone to a local print shop, pay online or in cash, and collect
            your printout. The shops are independent businesses that use HIMMER to take orders.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Your account</h2>
          <ul>
            <li>Keep your sign-in details to yourself. You are responsible for orders placed from your account.</li>
            <li>Please keep your name and phone number correct so the shop can reach you if something goes wrong.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>What you can print</h2>
          <ul>
            <li>Only print documents you have the right to print.</li>
            <li>Don&apos;t print anything illegal, or anything that copies someone else&apos;s work without permission.</li>
          </ul>
          <p>We can cancel orders that break these rules. Those orders are not refunded.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Prices and payment</h2>
          <ul>
            <li>You see the full price before you pay. It is based on your document, your settings and the shop&apos;s rates.</li>
            <li>The price you see is the price you pay. Nothing is added later.</li>
            <li>
              Online payments are processed by Cashfree Payments. By paying, you also agree to{" "}
              <a href="https://www.cashfree.com/tnc/" target="_blank" rel="noopener noreferrer">Cashfree&apos;s Terms</a>.
            </li>
            <li>Some shops also let you pay in cash at the counter.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Collecting your print</h2>
          <p>
            Please be at the shop to collect your printout. We aren&apos;t responsible for prints that are left behind or
            picked up by someone else.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Refunds</h2>
          <p>
            If your order can&apos;t be printed because of a printer or system problem, you get a full refund
            automatically. Read the <Link href="/refund">Refund &amp; Cancellation Policy</Link> for details.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>The shops</h2>
          <p>
            Each shop runs its own printers, sets its own prices, and is responsible for print quality and service.
            HIMMER handles ordering, payments and refunds for failed prints.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Limits of our responsibility</h2>
          <p>
            If something goes wrong, the most we are responsible for is the amount you paid for that order. We aren&apos;t
            responsible for indirect losses, such as missing a deadline.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Changes</h2>
          <p>
            We may update these terms. We&apos;ll change the date at the top when we do. If you keep using HIMMER, you accept
            the updated terms.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Law</h2>
          <p>These terms follow the laws of India. Any dispute will be handled by courts in India.</p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions? Email <a href="mailto:support@himmer.in">support@himmer.in</a> or visit the{" "}
            <Link href="/support">help centre</Link>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
