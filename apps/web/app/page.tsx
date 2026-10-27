import type { Metadata } from "next";
import { Homepage, printFaqs } from "@/components/marketing/Homepage";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://himmer.vercel.app";
export const metadata: Metadata = {
  title: { absolute: "HIMMER — Printing, made effortless." },
  description: "Print documents from your phone at a local shop. Choose your options, see the price and pay via UPI. HIMMER makes everyday printing simpler.",
  keywords: ["HIMMER", "printing software", "QR code printing", "print shop software India", "UPI document printing", "Yavatmal printing"],
  alternates: { canonical: "/" },
  openGraph: { title: "HIMMER — Printing, made effortless.", description: "From your phone. To the page. Just like that.", url: siteUrl, type: "website", images: [{url: "/images/brand/himmer-print-flow.png", width: 1344, height: 768, alt: "Phone-to-paper printing with HIMMER"}] },
  twitter: {card: "summary_large_image", title: "HIMMER — Printing, made effortless.", images: ["/images/brand/himmer-print-flow.png"]},
};

export default function LandingPage() {
  const jsonLd = {"@context": "https://schema.org", "@graph": [
    {"@type": "Organization", name: "HIMMER", url: siteUrl},
    {"@type": "WebSite", name: "HIMMER", url: siteUrl},
    {"@type": "FAQPage", mainEntity: printFaqs.map(({q,a}) => ({"@type": "Question", name: q, acceptedAnswer: {"@type": "Answer", text: a}}))},
  ]};
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd).replace(/</g, "\\u003c")}}/><Homepage /></>;
}
