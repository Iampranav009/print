import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { Brand } from "@/components/Brand";

const links = [["How it works", "/#how-it-works"], ["For print shops", "/#for-shops"], ["Pricing", "/#pricing"], ["Help", "/support"]];

export function SiteHeader() {
  return <header className="hm-header"><div className="hm-wrap hm-header-inner"><Brand /><nav aria-label="Main navigation" className="hm-desktop-nav">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><div className="hm-header-actions"><Link href="/login" className="hm-signin">Sign in</Link><Link href="/app/print" className="hm-button hm-button-small">Start printing <ArrowUpRight size={16} /></Link><details className="hm-mobile-nav"><summary aria-label="Open navigation"><Menu size={22} /></summary><nav aria-label="Mobile navigation">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}<Link href="/vendor/login">Partner sign in</Link><Link href="/login">Customer sign in</Link></nav></details></div></div></header>;
}

export function SiteFooter() {
  return <footer className="hm-footer"><div className="hm-wrap"><div className="hm-footer-grid"><div><Brand light /><p className="hm-footer-description">Less time at the counter.<br />More time for what matters.</p><span className="hm-footer-location">Made for everyday printing in India.</span></div><div><h2>For you</h2><Link href="/app/print">Print a document</Link><Link href="/app/nearby">Find a print shop</Link><Link href="/app/history">Your print history</Link></div><div><h2>For your shop</h2><Link href="/vendor/login">Partner portal</Link><Link href="/vendor/agent-download">Download print agent</Link><Link href="/#pricing">Pricing explained</Link></div><div><h2>Here to help</h2><Link href="/support">Support & FAQs</Link><Link href="/#how-it-works">How it works</Link><Link href="/support#printing">Printing help</Link></div></div><div className="hm-footer-bottom"><span>© {new Date().getFullYear()} HIMMER</span><span>Printing, made effortless.</span><Link href="/#top">Back to top ↑</Link></div></div></footer>;
}
