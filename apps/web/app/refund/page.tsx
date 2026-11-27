import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteChrome";
import { Breadcrumbs } from "@/components/Breadcrumbs";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "When HIMMER refunds a print order, how refunds work through Cashfree, and how long they take.",
  alternates: { canonical: "/refund" },
  openGraph: {
    title: "Refund & Cancellation Policy — HIMMER",
    description: "When HIMMER refunds a print order, how refunds work through Cashfree, and how long they take.",
    url: "/refund",
    siteName: "HIMMER",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Refund & Cancellation Policy — HIMMER",
    description: "When HIMMER refunds a print order, how refunds work through Cashfree, and how long they take.",
  },
};

export default function RefundPage() {
  return (
    <div className="hm-site" id="top">
      <SiteHeader />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Refund & Cancellation Policy" }]} />
      <main id="main-content" className="hm-wrap hm-prose" style={{ maxWidth: 720, padding: "3rem 1.5rem 5rem" }}>
        <p className="hm-eyebrow"><span aria-hidden="true" />LEGAL</p>
        <h1 style={{ marginBottom: "0.5rem" }}>Refund &amp; Cancellation Policy</h1>
        <p style={{ color: "var(--hm-muted, #888)", marginBottom: "2.5rem" }}>Last updated: 27 November 2026</p>

        <section style={{ marginBottom: "2rem" }}>
          <h2>The short version</h2>
          <p>
            If your order can&apos;t be printed because of a problem with the printer or our system, you get your full
            money back automatically. Otherwise, payments are final.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>When you get a refund</h2>
          <ul>
            <li>The printer fails and can&apos;t finish your order (for example, a paper jam, no paper, or a printer error).</li>
            <li>Our system has an error and your order can&apos;t be sent to the printer.</li>
            <li>Your paid order isn&apos;t printed within 30 minutes (for example, the shop&apos;s printer is offline).</li>
          </ul>
          <p>You get the full amount you paid. You don&apos;t need to ask for it.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>When you don&apos;t get a refund</h2>
          <ul>
            <li>Your order printed successfully.</li>
            <li>You uploaded the wrong file or picked the wrong settings (pages, copies, colour, paper size).</li>
            <li>You changed your mind after the order started printing.</li>
            <li>You didn&apos;t collect your printout.</li>
          </ul>
          <p>Unhappy with how a page looks (ink or paper quality)? Please speak to the shop. They run their own printers.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>How refunds work</h2>
          <ul>
            <li>When a print fails, we send the refund request to Cashfree Payments automatically.</li>
            <li>The money goes back the way you paid: the same UPI app, card or bank account.</li>
            <li>Your order page in the app shows the progress, from &quot;Refund requested&quot; to &quot;Refund processed&quot;.</li>
            <li>Banks usually take 5–7 working days to show the money in your account after the refund is processed.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>If you paid in cash</h2>
          <p>If you paid cash at the counter and the print fails, collect your money back from the shop counter.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Payment failed but money was taken?</h2>
          <p>
            If your order says &quot;Payment failed&quot; but money left your account, your bank or UPI app usually returns it
            on its own within 5–7 working days. If it doesn&apos;t, contact us with your order details.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Cancelling an order</h2>
          <ul>
            <li><strong>Before you pay:</strong> just leave. Unpaid orders expire after 20 minutes and are never printed or charged. If a payment goes through after that, it is refunded automatically.</li>
            <li><strong>After you pay:</strong> orders can&apos;t be cancelled once they are sent to the printer. If the printer can&apos;t print it, you are refunded as described above.</li>
          </ul>
        </section>

        <section>
          <h2>Need help?</h2>
          <p>
            Haven&apos;t received your refund after 7 working days? Email{" "}
            <a href="mailto:support@himmer.in">support@himmer.in</a> with the order from your History, or visit the{" "}
            <Link href="/support">help centre</Link>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
