import { SiteHeader, SiteFooter } from "@/components/marketing/SiteChrome";
import { Breadcrumbs } from "@/components/Breadcrumbs";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What HIMMER collects, why, and how your documents are deleted after printing.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy — HIMMER",
    description: "What HIMMER collects, why, and how your documents are deleted after printing.",
    url: "/privacy",
    siteName: "HIMMER",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — HIMMER",
    description: "What HIMMER collects, why, and how your documents are deleted after printing.",
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
        <p style={{ color: "var(--hm-muted, #888)", marginBottom: "2.5rem" }}>Last updated: 27 November 2026</p>

        <section style={{ marginBottom: "2rem" }}>
          <h2>The short version</h2>
          <ul>
            <li>We don&apos;t keep your documents. They are deleted after they print.</li>
            <li>We use your name, email and phone number only to sign you in and help with your orders.</li>
            <li>Payments go through Cashfree. We never see your card details or UPI PIN.</li>
            <li>We never sell your data or show you ads.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Your account:</strong> name, email address, phone number, and a profile photo if you add one. We use
              these to sign you in and to contact you if an order needs attention.
            </li>
            <li>
              <strong>Your print orders:</strong> file name, number of pages, copies, print settings (colour, paper size,
              sides), price, the shop, and the order status and time. We use these to price your order, show your
              history, and handle refunds.
            </li>
            <li>
              <strong>Your document:</strong> only so it can be printed. Nothing else.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Your documents</h2>
          <ul>
            <li>Your file is stored privately. Only the printer at the shop you chose can download it, using a link that expires in 5 minutes.</li>
            <li>When your order prints, we delete the file right away (at most 5 minutes later).</li>
            <li>The shop&apos;s HIMMER print app deletes its copy right after sending it to the printer.</li>
            <li>If you upload a file but don&apos;t place an order, or don&apos;t pay within 20 minutes, the order expires and the file is deleted.</li>
            <li>If a paid order isn&apos;t printed within 30 minutes (for example, the printer is offline), we cancel it, refund you, and delete the file.</li>
            <li>A file shared to HIMMER from another app waits on your phone for at most 10 minutes.</li>
            <li>We keep only the order details (like file name, pages and price) so you can see your history. Never the document itself.</li>
            <li>We never read, share or reuse your documents.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Your location</h2>
          <p>
            If you allow it on the Nearby screen, we use your location to show the closest shops. We don&apos;t save it.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Payments</h2>
          <p>
            Online payments are handled by Cashfree Payments. We only receive whether the payment worked and its
            reference number. Card and UPI details stay with Cashfree. See{" "}
            <a href="https://www.cashfree.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cashfree&apos;s Privacy Policy</a>.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Who sees your information</h2>
          <ul>
            <li><strong>The shop you print at</strong> gets your document and print settings so it can print your order.</li>
            <li><strong>Cashfree</strong> processes your payment and any refund.</li>
            <li>No one else. We don&apos;t sell or rent your data.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Cookies</h2>
          <p>
            We use cookies only to keep you signed in. The app also saves some of its own files on your phone so it
            opens faster. There are no advertising or tracking cookies.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Your choices</h2>
          <ul>
            <li>You can change your name, phone number and photo any time in Profile.</li>
            <li>You can ask us to delete your account and order history by emailing us.</li>
          </ul>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about your privacy? Email <a href="mailto:privacy@himmer.in">privacy@himmer.in</a>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
