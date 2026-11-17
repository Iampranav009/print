import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight, Menu,
  FileText, MapPin, History, Store, Download, IndianRupee,
  HelpCircle, BookOpen, MessageCircle, Activity,
  Instagram, Youtube, Linkedin,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import type { ReactNode } from "react";

const navLinks = [["How it works", "/#how-it-works"], ["For print shops", "/#for-shops"], ["Pricing", "/#pricing"], ["Help", "/support"]];

export function SiteHeader() {
  return <header className="hm-header"><div className="hm-wrap hm-header-inner"><Brand /><nav aria-label="Main navigation" className="hm-desktop-nav">{navLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><div className="hm-header-actions"><Link href="/login" className="hm-signin">Sign in</Link><Link href="/app/print" className="hm-button hm-button-small">Start printing <ArrowUpRight size={16} /></Link><details className="hm-mobile-nav"><summary aria-label="Open navigation"><Menu size={22} /></summary><nav aria-label="Mobile navigation">{navLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}<Link href="/vendor/login">Partner sign in</Link><Link href="/login">Customer sign in</Link></nav></details></div></div></header>;
}

function FooterCol({ heading, links }: { heading: string; links: { label: string; href: string; icon: ReactNode }[] }) {
  return (
    <div>
      <h3 className="hm-footer-col-heading">{heading}</h3>
      {links.map(({ label, href, icon }) => (
        <Link key={href} href={href} className="hm-footer-col-link">
          {icon}{label}
        </Link>
      ))}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="hm-footer">
      <div className="hm-wrap">
        <div className="hm-footer-top">
          <div className="hm-footer-brand-col">
            <Brand light />
            <p className="hm-footer-tagline">The easy printing platform for students,<br />professionals and businesses in India.</p>
            <span className="hm-footer-location">Upload, pay via UPI, and pick up from a nearby print shop — hassle-free.</span>
          </div>
          <div className="hm-footer-nav-cols">
            <FooterCol heading="For you" links={[
              { label: "Print a document", href: "/app/print", icon: <FileText size={14} /> },
              { label: "Find a print shop", href: "/app/nearby", icon: <MapPin size={14} /> },
              { label: "Print history", href: "/app/history", icon: <History size={14} /> },
            ]} />
            <FooterCol heading="For print shops" links={[
              { label: "Partner portal", href: "/vendor/login", icon: <Store size={14} /> },
              { label: "Download print agent", href: "/vendor/agent-download", icon: <Download size={14} /> },
              { label: "Pricing", href: "/#pricing", icon: <IndianRupee size={14} /> },
            ]} />
            <FooterCol heading="Help" links={[
              { label: "Help center", href: "/support", icon: <HelpCircle size={14} /> },
              { label: "Guides", href: "/#how-it-works", icon: <BookOpen size={14} /> },
              { label: "Contact support", href: "/support#printing", icon: <MessageCircle size={14} /> },
              { label: "Status", href: "/support", icon: <Activity size={14} /> },
            ]} />
          </div>
        </div>
      </div>

      <div className="hm-footer-giant" aria-hidden="true">
        <div className="hm-wrap hm-footer-giant-inner">
          <Image
            src="/himmer-symbol.png"
            alt=""
            width={200}
            height={200}
            className="hm-footer-symbol"
            aria-hidden
          />
          <span className="hm-footer-wordmark">HIMMER</span>
        </div>
      </div>

      <div className="hm-wrap">
        <div className="hm-footer-bottom">
          <span>© {new Date().getFullYear()} HIMMER</span>
          <div className="hm-footer-legal">
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/refund">Refund &amp; Cancellation</Link>
            <Link href="/partner-agreement">Partner Agreement</Link>
          </div>
          <div className="hm-footer-social">
            <Link href="https://instagram.com/himmer.in" aria-label="Instagram"><Instagram size={16} /></Link>
            <Link href="https://youtube.com/@himmer" aria-label="YouTube"><Youtube size={16} /></Link>
            <Link href="https://linkedin.com/company/himmer" aria-label="LinkedIn"><Linkedin size={16} /></Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
