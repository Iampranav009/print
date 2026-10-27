import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteChrome";
import { printFaqs } from "@/components/marketing/Homepage";

export const metadata: Metadata = {title: "Help with your print", description: "Help with HIMMER print orders, payment status and connecting your shop.", alternates: {canonical: "/support"}};
export default function SupportPage() {
  return <div className="hm-site" id="top"><SiteHeader/><main id="main-content" className="hm-wrap hm-support"><p className="hm-eyebrow">HIMMER HELP CENTRE</p><h1>A hand with<br />your next print.</h1><p className="hm-lead">Start with the answers below. For an order already in progress, your print history is the best place to check its latest status.</p><div className="hm-actions"><Link href="/app/history" className="hm-button">Check my print order →</Link><a href="mailto:support@printbuddy.app" className="hm-text-link">Email support ↗</a></div><section id="printing" className="hm-faq-list" aria-label="Printing questions">{printFaqs.map(({q,a}) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}<details><summary>How do I connect my shop?<span aria-hidden="true">+</span></summary><p>Sign in to the partner portal and complete your team-guided onboarding. Download the Windows print agent from Printer setup, then follow the connection instructions for your shop.</p></details><details><summary>What should I include when asking for help?<span aria-hidden="true">+</span></summary><p>Share the shop name, approximate order time and the status shown in your print history. Do not send your document, password, release code or payment credentials.</p></details></section></main><SiteFooter/></div>;
}
