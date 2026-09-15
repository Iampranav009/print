import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import {
  Printer,
  QrCode,
  Smartphone,
  BarChart3,
  ShieldCheck,
  Banknote,
  Wifi,
  ChevronRight,
  Download,
  Store,
  Zap,
  ArrowRight,
  MonitorSmartphone,
  Package,
  IndianRupee,
  Settings,
  Lock,
  Upload,
  CreditCard,
  X,
  MessageSquare,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  MapPin,
  Sparkles,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Fonts ─────────────────────────────────────────────────────────────────────

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// ─── SEO ───────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:
    "PrintBuddy — Best Digital Software & Print Software | Wireless Printing ATM Machine in Yotmal & India",
  description:
    "PrintBuddy is India's premier digital software and print software platform. Convert any Xerox printer into a self-service wireless printing machine, printing ATM machine, and printing vending machine. Scan QR, upload, pay via UPI, and print. Serving Yotmal and shops nationwide.",
  keywords: [
    "Yotmal",
    "Yotmal xerox shop",
    "Yotmal digital print service",
    "Yotmal college xerox centre",
    "Yavatmal printing software",
    "digital software",
    "Print Buddy",
    "Print Software",
    "wireless printing machine",
    "printing ATM machine",
    "printing vending machine",
    "self-serve printing kiosk",
    "print shop software India",
    "xerox shop management",
    "vendor print dashboard",
    "UPI print payment",
    "automatic print agent",
    "touchless printing solution",
    "cloud print agent India",
    "online print order system",
  ],
  authors: [{ name: "PrintBuddy" }],
  creator: "PrintBuddy",
  openGraph: {
    title:
      "PrintBuddy — Smart Print Software & Wireless Printing ATM Machine",
    description:
      "Convert any printer into a wireless printing machine and automated printing vending machine with Print Buddy digital software. Zero new hardware cost. Serving Yotmal and pan-India.",
    type: "website",
    locale: "en_IN",
    siteName: "PrintBuddy",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrintBuddy — Smart Print Software & Wireless Printing ATM Machine",
    description:
      "Scan. Pay. Print. Turn standard printers into a self-service printing ATM machine with Print Buddy digital software.",
  },
  robots: { index: true, follow: true },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className={cn(
        jakarta.className,
        "text-[11px] font-semibold tracking-[0.12em] uppercase text-[#0C831F] mb-4"
      )}
    >
      {children}
    </p>
  );
}

function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        manrope.className,
        "text-3xl sm:text-4xl font-bold text-[#0E1117] leading-tight tracking-[-0.025em]",
        className
      )}
      style={{ textWrap: "balance" } as React.CSSProperties}
    >
      {children}
    </h2>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const navLinks = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Install", href: "#install" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#0E1117]/90 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#0C831F] flex items-center justify-center shadow-md shadow-[#0C831F]/30">
            <Printer className="w-3.5 h-3.5 text-white" />
          </div>
          <span
            className={cn(
              manrope.className,
              "text-[15px] font-bold text-white tracking-tight"
            )}
          >
            PrintBuddy
          </span>
          <span
            className={cn(
              jakarta.className,
              "text-[10px] font-semibold text-[#4ade80] bg-[#0C831F]/15 border border-[#0C831F]/30 rounded-full px-2 py-0.5 hidden sm:inline-block"
            )}
          >
            Beta
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                jakarta.className,
                "px-3.5 py-2 text-sm text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/login"
            className={cn(
              jakarta.className,
              "hidden sm:inline-flex px-4 py-2 text-sm text-zinc-300 border border-white/[0.12] rounded-xl hover:border-white/25 hover:text-white transition-all"
            )}
          >
            Customer App
          </Link>
          <Link
            href="/vendor/login"
            className={cn(
              manrope.className,
              "px-4 py-2 text-sm font-bold bg-[#0C831F] text-white rounded-xl hover:bg-[#086618] transition-colors shadow-lg shadow-[#0C831F]/20"
            )}
          >
            Vendor Portal
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function HeroVisual() {
  return (
    <div className="relative w-full max-w-[420px] xl:max-w-[460px]">
      {/* Step cards */}
      <div className="space-y-3">
        {/* Step 1 — Done */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#0C831F]/15 border border-[#0C831F]/20 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5 text-[#4ade80]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(manrope.className, "text-sm font-semibold text-white leading-tight")}>
              QR scanned
            </p>
            <p className={cn(jakarta.className, "text-xs text-zinc-500 mt-0.5")}>
              Linked to print shop · No app needed
            </p>
          </div>
          <div className="w-6 h-6 rounded-full bg-[#0C831F] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Step 2 — Done */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(manrope.className, "text-sm font-semibold text-white leading-tight")}>
              File uploaded
            </p>
            <p className={cn(jakarta.className, "text-xs text-zinc-500 mt-0.5")}>
              PDF · B&amp;W · Double-sided
            </p>
          </div>
          <div className="w-6 h-6 rounded-full bg-[#0C831F] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Step 3 — Active */}
        <div className="bg-[#0C831F]/10 border border-[#0C831F]/30 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#0C831F]/20 border border-[#0C831F]/30 flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5 text-[#4ade80]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(manrope.className, "text-sm font-semibold text-white leading-tight")}>
              Paid via UPI
            </p>
            <p className={cn(jakarta.className, "text-xs text-[#4ade80] font-medium mt-0.5")}>
              Exact locked price · Settling…
            </p>
          </div>
          <span className="flex items-center gap-1.5 bg-[#0C831F] rounded-full px-2.5 py-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className={cn(jakarta.className, "text-white text-[10px] font-semibold")}>
              Printing
            </span>
          </span>
        </div>
      </div>

      {/* Floating printer badge */}
      <div className="absolute -bottom-5 -left-5 bg-white rounded-xl shadow-2xl px-3.5 py-2.5 flex items-center gap-2.5 border border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-[#0C831F]/10 flex items-center justify-center shrink-0">
          <Printer className="w-4 h-4 text-[#0C831F]" />
        </div>
        <div>
          <p className={cn(manrope.className, "text-xs font-bold text-gray-900")}>
            Auto-printing
          </p>
          <p className={cn(jakarta.className, "text-[10px] text-gray-400")}>
            Enter 4-digit code to collect
          </p>
        </div>
      </div>

      {/* Top-right floating stat */}
      <div className="absolute -top-4 -right-4 bg-[#0E1117] border border-white/[0.1] rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
        <span className={cn(jakarta.className, "text-[11px] font-semibold text-zinc-300")}>
          Live · Realtime updates
        </span>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section
      className="relative bg-[#0E1117] pt-[108px] pb-16 overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* Green glow blobs */}
      <div
        className="absolute top-[-80px] left-[-100px] w-[700px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 30%, rgba(12,131,31,0.12) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[600px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 70% 60%, rgba(12,131,31,0.07) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 relative z-10">
        {/* Two-column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 xl:gap-x-20 items-center">

          {/* Left: content */}
          <div>
            {/* Beta pill */}
            <div className="flex items-center gap-2.5 mb-8 lg:mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse shrink-0" />
              <span
                className={cn(
                  jakarta.className,
                  "text-xs font-semibold text-zinc-400 tracking-[0.1em] uppercase"
                )}
              >
                Smart Digital Software · Active in Yotmal &amp; Nationwide
              </span>
            </div>

            {/* Signature headline */}
            <h1
              className={cn(
                manrope.className,
                "font-extrabold leading-[0.88] tracking-[-0.045em] mb-8 lg:mb-10"
              )}
              style={{ fontSize: "clamp(64px, 9vw, 108px)" }}
            >
              <span className="block text-white">Scan.</span>
              <span className="block text-white">Pay.</span>
              <span className="block text-[#0C831F]">Print.</span>
            </h1>

            <p
              className={cn(
                jakarta.className,
                "text-[17px] text-zinc-400 leading-[1.7] mb-9 max-w-lg"
              )}
            >
              <strong className="text-white font-semibold">Print Buddy</strong> is the leading{" "}
              <strong className="text-white font-semibold">digital software</strong> and{" "}
              <strong className="text-white font-semibold">print software</strong> transforming any Xerox printer into an unattended{" "}
              <strong className="text-[#4ade80] font-semibold">wireless printing machine</strong> and{" "}
              <strong className="text-[#4ade80] font-semibold">printing ATM machine</strong>. Customers upload from their phone, pay via UPI, and collect with a secure 4-digit code.{" "}
              <span className="text-zinc-200 font-medium">
                No new hardware. Zero manual queues.
              </span>
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <Link
                href="/vendor/login"
                className={cn(
                  manrope.className,
                  "inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#0C831F] text-white text-[15px] font-bold rounded-2xl hover:bg-[#086618] transition-colors shadow-xl shadow-[#0C831F]/30"
                )}
              >
                <Store className="w-4 h-4 shrink-0" />
                Set Up My Shop
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
              <Link
                href="/login"
                className={cn(
                  jakarta.className,
                  "inline-flex items-center gap-2.5 px-7 py-3.5 border border-white/[0.12] text-zinc-300 text-sm font-medium rounded-2xl hover:border-white/25 hover:text-white transition-all"
                )}
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                Open Customer App
              </Link>
            </div>

            <p className={cn(jakarta.className, "text-xs text-zinc-500")}>
              Works on your existing Windows PC and printer · Powers self-service printing vending machines in Yotmal &amp; across India
            </p>
          </div>

          {/* Right: product visual — desktop only */}
          <div className="hidden lg:flex justify-end items-center pt-8">
            <HeroVisual />
          </div>

        </div>
      </div>

      {/* Flow strip — full width below the two columns */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 mt-16 lg:mt-24 relative z-10">
        <FlowStrip />
      </div>
    </section>
  );
}

function FlowStrip() {
  const steps = [
    {
      icon: QrCode,
      label: "Scan QR at shop",
      sub: "No app install required",
    },
    {
      icon: Upload,
      label: "Upload document",
      sub: "PDF, Word, or image",
    },
    {
      icon: IndianRupee,
      label: "Pay via UPI",
      sub: "GPay, PhonePe, BHIM — exact locked price",
    },
    {
      icon: Printer,
      label: "Collect at counter",
      sub: "Enter 4-digit code to release",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {steps.map((step, i) => (
        <div
          key={i}
          className="relative bg-white/[0.025] border border-white/[0.06] rounded-2xl p-5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0C831F]/15 border border-[#0C831F]/20 flex items-center justify-center mb-4">
            <step.icon className="w-5 h-5 text-[#4ade80]" />
          </div>
          <p className={cn(manrope.className, "text-sm font-semibold text-white mb-1")}>
            {step.label}
          </p>
          <p className={cn(jakarta.className, "text-xs text-zinc-500 leading-relaxed")}>
            {step.sub}
          </p>
          {i < 3 && (
            <ChevronRight className="hidden lg:block absolute top-1/2 -right-[7px] -translate-y-1/2 w-3 h-3 text-zinc-700 z-10" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Problem vs PrintBuddy ────────────────────────────────────────────────────

function ProblemSection() {
  const oldWay = [
    { icon: MessageSquare, text: "Customer WhatsApps a PDF to the shop" },
    { icon: Download, text: "Shopkeeper downloads file from WhatsApp" },
    { icon: Monitor, text: "Opens on PC, sets print options manually" },
    { icon: Printer, text: "Sends to printer, waits, hands it over" },
  ];

  const newWay = [
    { icon: QrCode, text: "Customer scans the QR code at your counter" },
    { icon: Upload, text: "Selects file, picks B&W/colour and copies" },
    { icon: CreditCard, text: "Pays the locked price via UPI instantly" },
    { icon: Printer, text: "Enters their code — print is released" },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#F7F7F5]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="mb-14">
          <SectionLabel>Why PrintBuddy exists</SectionLabel>
          <SectionHeading className="max-w-xl">
            Printing was broken.
            <br />
            We fixed it.
          </SectionHeading>
          <p
            className={cn(
              jakarta.className,
              "text-zinc-500 text-base mt-4 max-w-lg leading-relaxed"
            )}
          >
            The old way was WhatsApp, USB drives, manual queues, and human error.
            PrintBuddy replaces all of it with four taps on a phone.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Old way */}
          <div className="rounded-2xl border-2 border-red-200/70 bg-white p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                <X className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h3
                  className={cn(manrope.className, "text-sm font-bold text-[#0E1117]")}
                >
                  The Old Way
                </h3>
                <p
                  className={cn(
                    jakarta.className,
                    "text-xs text-red-500 font-medium"
                  )}
                >
                  Slow · Unreliable · Privacy risks
                </p>
              </div>
            </div>
            <div className="space-y-2.5">
              {oldWay.map(({ icon: Icon, text }, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-red-50/60 rounded-xl p-3.5 border border-red-100/70"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-red-100 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <p className={cn(jakarta.className, "text-sm text-zinc-600")}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span
                className={cn(
                  jakarta.className,
                  "text-xs text-red-500 font-medium"
                )}
              >
                4+ manual steps, human error, customer privacy exposed
              </span>
            </div>
          </div>

          {/* PrintBuddy way */}
          <div className="rounded-2xl border-2 border-[#0C831F]/25 bg-white p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[#0C831F] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3
                  className={cn(manrope.className, "text-sm font-bold text-[#0E1117]")}
                >
                  The PrintBuddy Way
                </h3>
                <p
                  className={cn(
                    jakarta.className,
                    "text-xs text-[#0C831F] font-medium"
                  )}
                >
                  Fast · Cashless · Zero manual work
                </p>
              </div>
            </div>
            <div className="space-y-2.5">
              {newWay.map(({ icon: Icon, text }, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-[#F0FAF1] rounded-xl p-3.5 border border-[#0C831F]/15"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0C831F] flex items-center justify-center shrink-0">
                    <span className={cn(manrope.className, "text-white text-xs font-bold")}>
                      {i + 1}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-white border border-[#0C831F]/15 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-[#0C831F]" />
                  </div>
                  <p
                    className={cn(
                      jakarta.className,
                      "text-sm text-zinc-700 font-medium"
                    )}
                  >
                    {text}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0C831F] shrink-0" />
              <span
                className={cn(
                  jakarta.className,
                  "text-xs text-[#0C831F] font-semibold"
                )}
              >
                Zero WhatsApp, zero USB drives, zero manual intervention
              </span>
            </div>
          </div>
        </div>

        {/* No hardware callout */}
        <div className="mt-5 rounded-2xl bg-[#0E1117] p-7 sm:p-9 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0C831F]/20 border border-[#0C831F]/25 flex items-center justify-center shrink-0">
            <Monitor className="w-6 h-6 text-[#4ade80]" />
          </div>
          <div className="flex-1">
            <h3 className={cn(manrope.className, "text-lg font-bold text-white")}>
              No new hardware required
            </h3>
            <p
              className={cn(
                jakarta.className,
                "text-zinc-400 text-sm mt-1.5 leading-relaxed max-w-xl"
              )}
            >
              Most print shops already have a Windows PC and a printer. PrintBuddy runs on that
              exact setup. Install the Print Agent once, connect your printer, paste the QR sticker
              on your counter — and you&apos;re live.
            </p>
          </div>
          <Link
            href="/vendor/login"
            className={cn(
              manrope.className,
              "shrink-0 inline-flex items-center gap-2 bg-[#0C831F] text-white font-bold text-sm rounded-xl px-6 py-3 hover:bg-[#086618] transition-colors shadow-lg shadow-[#0C831F]/25"
            )}
          >
            Join as a Vendor
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Wireless Printing ATM & Vending Section ──────────────────────────────────

function PrintingAtmSection() {
  const cards = [
    {
      icon: Wifi,
      badge: "Wireless Freedom",
      title: "Universal Wireless Printing Machine",
      subtitle: "Zero cables, zero drivers, zero WhatsApp sharing",
      desc: "Transform any desktop or Xerox printer into an instant wireless printing machine. Customers never need to plug in flash drives or transfer files over WhatsApp. They simply scan the shop QR code, select their document, and transmit it wirelessly straight to the print agent.",
      bullets: [
        "Eliminates USB malware & virus threats",
        "Supports PDF, Word, PowerPoint, & Images",
        "Automatic duplex & color separation",
      ],
      tag: "Wireless Printing",
    },
    {
      icon: Lock,
      badge: "PIN-Protected Release",
      title: "Secure Printing ATM Machine",
      subtitle: "Bank-grade privacy with 4-digit release code",
      desc: "Operate your counter just like a financial ATM machine. Once paid, jobs remain encrypted and paused until the customer physically arrives at your printer and enters their 4-digit release code. No stranger can ever grab another customer's Aadhaar card, exam paper, or confidential document.",
      bullets: [
        "Unattended output tray protection",
        "4-digit release code on customer's phone",
        "Instant document shredding after print",
      ],
      tag: "Printing ATM",
    },
    {
      icon: Cpu,
      badge: "24/7 Self-Service",
      title: "Autonomous Printing Vending Machine",
      subtitle: "Instant UPI payments with automatic queue dispatch",
      desc: "Turn your counter into an automated printing vending machine. Customers scan, preview exact page counts and locked prices, pay in 2 seconds using Google Pay, PhonePe, or BHIM, and receive their prints immediately. Your shop stays productive even during peak exam rush.",
      bullets: [
        "Razorpay UPI intent checkout",
        "100% locked & deterministic pricing",
        "Automatic refunds on printer paper jam",
      ],
      tag: "Printing Vending",
    },
  ];

  return (
    <section className="py-24 bg-[#0E1117] relative overflow-hidden border-t border-b border-white/[0.06]">
      <div
        className="absolute top-0 right-1/4 w-[500px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(12,131,31,0.09) 0%, transparent 70%)",
        }}
      />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p
            className={cn(
              jakarta.className,
              "text-[11px] font-semibold tracking-[0.12em] uppercase text-[#4ade80] mb-4"
            )}
          >
            Digital Software Revolution
          </p>
          <h2
            className={cn(
              manrope.className,
              "text-3xl sm:text-5xl font-extrabold text-white leading-tight tracking-[-0.03em] mb-6"
            )}
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            The Wireless Printing ATM Machine &amp; Vending Solution
          </h2>
          <p
            className={cn(
              jakarta.className,
              "text-zinc-400 text-base sm:text-lg leading-relaxed"
            )}
          >
            <strong className="text-zinc-200">Print Buddy</strong> is specialized{" "}
            <strong className="text-zinc-200">print software</strong> and{" "}
            <strong className="text-zinc-200">digital software</strong> that upgrades ordinary
            shop hardware into a connected <strong className="text-[#4ade80]">wireless printing machine</strong>,
            a secure <strong className="text-[#4ade80]">printing ATM machine</strong>, and a self-serve{" "}
            <strong className="text-[#4ade80]">printing vending machine</strong> — all without buying new kiosks.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div
              key={c.title}
              className="bg-white/[0.03] border border-white/[0.08] hover:border-[#0C831F]/40 rounded-2xl p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-[#0C831F]/10 group"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-[#0C831F]/15 border border-[#0C831F]/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <c.icon className="w-6 h-6 text-[#4ade80]" />
                  </div>
                  <span
                    className={cn(
                      jakarta.className,
                      "text-[11px] font-semibold bg-[#0C831F]/20 text-[#4ade80] border border-[#0C831F]/30 rounded-full px-3 py-1"
                    )}
                  >
                    {c.badge}
                  </span>
                </div>

                <h3
                  className={cn(
                    manrope.className,
                    "text-xl font-bold text-white mb-1.5"
                  )}
                >
                  {c.title}
                </h3>
                <p
                  className={cn(
                    jakarta.className,
                    "text-xs text-[#4ade80] font-medium mb-4"
                  )}
                >
                  {c.subtitle}
                </p>
                <p
                  className={cn(
                    jakarta.className,
                    "text-sm text-zinc-400 leading-relaxed mb-6"
                  )}
                >
                  {c.desc}
                </p>
              </div>

              <div>
                <div className="border-t border-white/[0.06] pt-5 space-y-2.5">
                  {c.bullets.map((b) => (
                    <div key={b} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0" />
                      <span className={cn(jakarta.className, "text-xs text-zinc-300")}>
                        {b}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ──────────────────────────────────────────────────────────────────

function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      color: "bg-amber-50 border-amber-100 text-amber-500",
      title: "Auto Job Dispatch",
      desc: "Paid jobs are pushed to your printer via Supabase Realtime. No polling, no manual action.",
    },
    {
      icon: Lock,
      color: "bg-blue-50 border-blue-100 text-blue-500",
      title: "4-Digit Release Code",
      desc: "Prints only release when the customer is physically at your shop and enters their private code.",
    },
    {
      icon: IndianRupee,
      color: "bg-[#F0FAF1] border-[#0C831F]/20 text-[#0C831F]",
      title: "Locked UPI Price",
      desc: "The exact price is shown before payment — no disputes, no rounding surprises, no cash handling.",
    },
    {
      icon: BarChart3,
      color: "bg-indigo-50 border-indigo-100 text-indigo-500",
      title: "Live Vendor Dashboard",
      desc: "Track daily jobs, revenue, B&W vs colour splits, and full job history from any device.",
    },
    {
      icon: Database,
      color: "bg-violet-50 border-violet-100 text-violet-500",
      title: "Offline Resilient Queue",
      desc: "Already-paid jobs are held in a local SQLite queue and print automatically when connectivity returns.",
    },
    {
      icon: ShieldCheck,
      color: "bg-teal-50 border-teal-100 text-teal-500",
      title: "Auto Refunds",
      desc: "Paper jam or power cut? Razorpay refunds are triggered automatically — keeping customers happy.",
    },
    {
      icon: Settings,
      color: "bg-gray-50 border-gray-200 text-gray-500",
      title: "Flexible Shop Pricing",
      desc: "Set your own rates for B&W, colour, A4, A3, and duplex discounts. Change them anytime.",
    },
    {
      icon: Printer,
      color: "bg-sky-50 border-sky-100 text-sky-500",
      title: "Works With Any Printer",
      desc: "No vendor SDKs needed. Uses standard Windows Print Spooler or CUPS on Linux — universal.",
    },
  ];

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <div>
            <SectionLabel>Platform features</SectionLabel>
            <SectionHeading>
              Everything your shop needs,
              <br />
              nothing it doesn&apos;t
            </SectionHeading>
          </div>
          <p
            className={cn(
              jakarta.className,
              "text-zinc-500 text-sm max-w-xs lg:text-right leading-relaxed"
            )}
          >
            Purpose-built for Indian xerox and print shops — battle-tested for exam-season
            rush and power cuts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-[#E5E5E2] bg-white p-5 hover:border-[#0C831F]/30 hover:shadow-md transition-all duration-200"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl border flex items-center justify-center mb-4",
                  f.color
                )}
              >
                <f.icon className="w-5 h-5" />
              </div>
              <h3
                className={cn(
                  manrope.className,
                  "font-semibold text-[#0E1117] mb-2 text-[15px]"
                )}
              >
                {f.title}
              </h3>
              <p className={cn(jakarta.className, "text-sm text-zinc-500 leading-relaxed")}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Regional Hub: Yotmal & Nationwide ────────────────────────────────────────

function YotmalNetworkSection() {
  const hubs = [
    {
      name: "Yotmal College Campus Points",
      desc: "Engineered for student rush near engineering colleges, polytechnics, and coaching centres across Yotmal.",
    },
    {
      name: "Market Xerox & Cyber Centers",
      desc: "Empowering local Xerox vendors in main markets with contactless UPI document processing and zero line bottlenecks.",
    },
    {
      name: "Government & Legal Document Hubs",
      desc: "PIN-secured printing for sensitive court documents, affidavits, and identity verifications with zero data retention.",
    },
    {
      name: "Tier-2 & Tier-3 City Expansion",
      desc: "Bringing world-class automated print software to grassroots business hubs across Maharashtra and India.",
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-[#F7F7F5] to-white border-b border-[#E5E5E2]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 bg-[#0C831F]/10 border border-[#0C831F]/20 rounded-full px-3.5 py-1 mb-5">
              <MapPin className="w-3.5 h-3.5 text-[#0C831F]" />
              <span
                className={cn(
                  jakarta.className,
                  "text-xs font-bold uppercase tracking-wider text-[#0C831F]"
                )}
              >
                Local Network Spotlight
              </span>
            </div>
            <h2
              className={cn(
                manrope.className,
                "text-3xl sm:text-4xl font-extrabold text-[#0E1117] leading-tight tracking-[-0.03em] mb-5"
              )}
            >
              Powering Print Shops in{" "}
              <span className="text-[#0C831F]">Yotmal</span> &amp; Across Maharashtra
            </h2>
            <p
              className={cn(
                jakarta.className,
                "text-zinc-600 text-base leading-relaxed mb-8"
              )}
            >
              Whether you run a high-volume Xerox centre near educational institutes in{" "}
              <strong className="text-zinc-900 font-semibold">Yotmal</strong>, a cyber café, or a busy commercial
              stationery shop, <strong className="text-[#0C831F] font-semibold">Print Buddy digital software</strong> gives you an unfair advantage. Eliminate
              WhatsApp bottlenecks, stop handling dirty cash, and turn every printer into an automated{" "}
              <strong className="text-zinc-900 font-semibold">wireless printing machine</strong> in less than 5 minutes.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/vendor/login"
                className={cn(
                  manrope.className,
                  "inline-flex items-center gap-2 px-6 py-3.5 bg-[#0C831F] text-white text-sm font-bold rounded-xl hover:bg-[#086618] transition-colors shadow-lg shadow-[#0C831F]/25"
                )}
              >
                <Store className="w-4 h-4" />
                Register Your Yotmal Shop
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/app/nearby"
                className={cn(
                  jakarta.className,
                  "inline-flex items-center gap-2 px-6 py-3.5 border border-gray-300 text-zinc-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                )}
              >
                <MapPin className="w-4 h-4 text-[#0C831F]" />
                Find Nearby Printers
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hubs.map((hub) => (
              <div
                key={hub.name}
                className="bg-white border border-[#E5E5E2] rounded-2xl p-5 shadow-sm hover:border-[#0C831F]/30 hover:shadow-md transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-[#0C831F]/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-4 h-4 text-[#0C831F]" />
                </div>
                <h3
                  className={cn(
                    manrope.className,
                    "text-sm font-bold text-[#0E1117] mb-1.5"
                  )}
                >
                  {hub.name}
                </h3>
                <p
                  className={cn(
                    jakarta.className,
                    "text-xs text-zinc-500 leading-relaxed"
                  )}
                >
                  {hub.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── For Vendors ───────────────────────────────────────────────────────────────

function ForVendorsSection() {
  const benefits = [
    {
      icon: Zap,
      title: "Instant online orders",
      desc: "Jobs arrive automatically via WebSocket — no port forwarding, no polling.",
    },
    {
      icon: IndianRupee,
      title: "Daily bank settlements",
      desc: "Earnings go directly to your registered bank account. Full transaction history in your dashboard.",
    },
    {
      icon: BarChart3,
      title: "Real-time shop analytics",
      desc: "Track job counts, revenue, paper types, and queue status from any device.",
    },
    {
      icon: Wifi,
      title: "Runs when internet drops",
      desc: "Paid jobs stay in a local queue and print automatically when connection restores.",
    },
  ];

  return (
    <section className="py-24 bg-[#0C831F] overflow-hidden relative">
      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <p
              className={cn(
                jakarta.className,
                "text-[11px] font-semibold tracking-[0.12em] uppercase text-white/50 mb-5"
              )}
            >
              For shop owners
            </p>
            <h2
              className={cn(
                manrope.className,
                "text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-[-0.03em] mb-6"
              )}
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Grow your print business without new hardware
            </h2>
            <p
              className={cn(
                jakarta.className,
                "text-white/65 text-base leading-relaxed mb-10 max-w-md"
              )}
            >
              PrintBuddy connects your existing printer and PC to every student and professional
              in your area. They order online — you just print.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {benefits.map((b) => (
                <div
                  key={b.title}
                  className="bg-white/[0.08] border border-white/[0.12] rounded-2xl p-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mb-3">
                    <b.icon className="w-4 h-4 text-white" />
                  </div>
                  <h3
                    className={cn(manrope.className, "text-sm font-bold text-white mb-1")}
                  >
                    {b.title}
                  </h3>
                  <p
                    className={cn(
                      jakarta.className,
                      "text-xs text-white/55 leading-relaxed"
                    )}
                  >
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/vendor/login"
                className={cn(
                  manrope.className,
                  "inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#0C831F] text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                )}
              >
                <Store className="w-4 h-4" />
                Open Vendor Dashboard
              </Link>
              <Link
                href="#install"
                className={cn(
                  jakarta.className,
                  "inline-flex items-center gap-2 px-7 py-3.5 border border-white/25 text-white text-sm font-medium rounded-xl hover:bg-white/10 transition-colors"
                )}
              >
                <Download className="w-4 h-4" />
                Install Print Agent
              </Link>
            </div>
          </div>

          {/* Right: vendor dashboard preview */}
          <div className="relative">
            <div className="rounded-2xl bg-white shadow-2xl overflow-hidden border border-white/20">
              {/* Dashboard header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#0C831F] flex items-center justify-center">
                    <Printer className="w-3 h-3 text-white" />
                  </div>
                  <span
                    className={cn(
                      manrope.className,
                      "text-sm font-semibold text-[#0E1117]"
                    )}
                  >
                    Vendor Dashboard
                  </span>
                  <span
                    className={cn(
                      jakarta.className,
                      "text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2 py-0.5"
                    )}
                  >
                    Preview
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-semibold rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3 p-5">
                {[
                  { label: "Jobs today", value: "—" },
                  { label: "Revenue", value: "—" },
                  { label: "Pages", value: "—" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p
                      className={cn(
                        manrope.className,
                        "text-2xl font-bold text-gray-300 tabular-nums"
                      )}
                    >
                      {s.value}
                    </p>
                    <p
                      className={cn(
                        jakarta.className,
                        "text-[10px] text-gray-400 mt-0.5"
                      )}
                    >
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Queue */}
              <div className="px-5 pb-5 space-y-2">
                <p
                  className={cn(
                    jakarta.className,
                    "text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2"
                  )}
                >
                  Print Queue
                </p>
                {[
                  {
                    label: "Job #001",
                    pages: "4 pages",
                    status: "Printing",
                    color: "text-blue-600 bg-blue-50",
                  },
                  {
                    label: "Job #002",
                    pages: "12 pages",
                    status: "Paid",
                    color: "text-emerald-700 bg-emerald-50",
                  },
                  {
                    label: "Job #003",
                    pages: "2 pages",
                    status: "Waiting",
                    color: "text-amber-700 bg-amber-50",
                  },
                ].map((job) => (
                  <div
                    key={job.label}
                    className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5"
                  >
                    <div>
                      <p
                        className={cn(
                          manrope.className,
                          "text-xs font-semibold text-gray-800"
                        )}
                      >
                        {job.label}
                      </p>
                      <p className={cn(jakarta.className, "text-[10px] text-gray-400")}>
                        {job.pages}
                      </p>
                    </div>
                    <span
                      className={cn(
                        jakarta.className,
                        "text-[10px] font-semibold rounded-full px-2 py-0.5",
                        job.color
                      )}
                    >
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Badge */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-2.5 border border-gray-100">
              <div className="w-8 h-8 rounded-full bg-[#0C831F]/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#0C831F]" />
              </div>
              <div>
                <div className={cn(manrope.className, "text-xs font-bold text-gray-900")}>
                  Live in &lt;5 min
                </div>
                <div className={cn(jakarta.className, "text-[10px] text-gray-400")}>
                  Download · Login · Print
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Install ───────────────────────────────────────────────────────────────────

function InstallSection() {
  const tiers = [
    {
      icon: MonitorSmartphone,
      badge: "Recommended · Most shops",
      title: "Your existing Windows PC",
      subtitle: "Tier 0 — Zero new hardware",
      desc: "Download and run the PrintBuddy Print Agent on the shop's current PC. Works with any USB or network printer.",
      features: [
        "Windows 10 or 11",
        "Any USB or network printer",
        "Outbound WebSocket — no port forwarding",
        "Auto-updates in background",
        "Local SQLite fallback queue",
      ],
      cta: "Download Print Agent",
      href: "#download-agent",
      ctaIcon: Download,
      primary: true,
    },
    {
      icon: Package,
      badge: "For shops without a spare PC",
      title: "Raspberry Pi 4",
      subtitle: "Tier 1 — Headless print node",
      desc: "We ship a pre-configured Raspberry Pi that plugs straight into your printer. Zero setup needed.",
      features: [
        "Pre-paired to your shop account",
        "CUPS on Linux — universal driver support",
        "24/7 uptime with auto-restart",
        "Palm-sized, fits on your counter",
        "Power-loss recovery built in",
      ],
      cta: "Request a Pi Kit",
      href: "/vendor/login",
      ctaIcon: Package,
      primary: false,
    },
  ];

  return (
    <section id="install" className="py-24 bg-[#F7F7F5]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="mb-14">
          <SectionLabel>Software-first</SectionLabel>
          <SectionHeading>Install PrintBuddy</SectionHeading>
          <p
            className={cn(
              jakarta.className,
              "text-zinc-500 text-base mt-4 max-w-lg leading-relaxed"
            )}
          >
            Get your shop online in under 5 minutes. No new hardware required — use the PC you
            already have.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          {tiers.map((tier) => (
            <div
              key={tier.title}
              className={cn(
                "rounded-2xl border-2 p-7",
                tier.primary
                  ? "border-[#0C831F]/30 bg-white"
                  : "border-[#E5E5E2] bg-white hover:border-gray-300 transition-colors"
              )}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 rounded-2xl bg-[#0C831F]/10 border border-[#0C831F]/20 flex items-center justify-center">
                  <tier.icon className="w-5 h-5 text-[#0C831F]" />
                </div>
                <span
                  className={cn(
                    jakarta.className,
                    "text-[11px] font-semibold bg-[#F7F7F5] text-zinc-500 rounded-full px-3 py-1 border border-[#E5E5E2]"
                  )}
                >
                  {tier.badge}
                </span>
              </div>

              <h3
                className={cn(manrope.className, "text-lg font-bold text-[#0E1117]")}
              >
                {tier.title}
              </h3>
              <p
                className={cn(
                  jakarta.className,
                  "text-xs text-[#0C831F] font-medium mt-0.5 mb-3"
                )}
              >
                {tier.subtitle}
              </p>
              <p
                className={cn(
                  jakarta.className,
                  "text-sm text-zinc-500 leading-relaxed mb-5"
                )}
              >
                {tier.desc}
              </p>

              <ul className="space-y-2.5 mb-7">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0C831F] shrink-0" />
                    <span className={cn(jakarta.className, "text-sm text-zinc-600")}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={cn(
                  manrope.className,
                  "w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-colors",
                  tier.primary
                    ? "bg-[#0C831F] text-white hover:bg-[#086618] shadow-lg shadow-[#0C831F]/20"
                    : "border-2 border-[#E5E5E2] text-zinc-700 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <tier.ctaIcon className="w-4 h-4" />
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Customer PWA */}
        <div className="rounded-2xl border-2 border-dashed border-[#0C831F]/25 bg-white p-7 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0C831F] flex items-center justify-center shadow-lg shadow-[#0C831F]/25 shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className={cn(manrope.className, "text-base font-bold text-[#0E1117]")}>
              Customer App — No App Store needed
            </h3>
            <p
              className={cn(
                jakarta.className,
                "text-sm text-zinc-500 mt-1.5 leading-relaxed"
              )}
            >
              Customers open{" "}
              <strong className="text-zinc-700">printbuddy.in</strong> in their mobile
              browser and tap{" "}
              <strong className="text-zinc-700">&quot;Add to Home Screen&quot;</strong> for a
              native-feeling install. Works on Android and iOS.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {["Android Chrome", "Safari iOS", "No app store", "Instant install"].map(
                (tag) => (
                  <span
                    key={tag}
                    className={cn(
                      jakarta.className,
                      "text-xs bg-[#F7F7F5] text-zinc-500 rounded-full px-2.5 py-1 font-medium border border-[#E5E5E2]"
                    )}
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>
          <Link
            href="/login"
            className={cn(
              manrope.className,
              "shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-[#0E1117] text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-colors"
            )}
          >
            Open Customer App
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ───────────────────────────────────────────────────────────────────

function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="mb-14 text-center">
          <SectionLabel>Simple pricing</SectionLabel>
          <SectionHeading>You earn. We take a small cut.</SectionHeading>
          <p
            className={cn(
              jakarta.className,
              "text-zinc-500 text-base mt-4 max-w-lg mx-auto leading-relaxed"
            )}
          >
            No monthly fees, no setup costs. PrintBuddy charges a commission only when you
            make money.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* You set the price */}
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-7">
            <div className="w-10 h-10 rounded-xl bg-[#F7F7F5] border border-[#E5E5E2] flex items-center justify-center mb-5">
              <Settings className="w-5 h-5 text-zinc-500" />
            </div>
            <h3 className={cn(manrope.className, "font-bold text-[#0E1117] mb-2")}>
              You Set the Price
            </h3>
            <p
              className={cn(
                jakarta.className,
                "text-sm text-zinc-500 mb-5 leading-relaxed"
              )}
            >
              Configure your own rates for every print type. Change them anytime.
            </p>
            <ul className="space-y-2.5">
              {[
                "Per-page B&W rate",
                "Per-page colour rate",
                "A3 paper size multiplier",
                "Duplex discounts",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0C831F] shrink-0" />
                  <span className={cn(jakarta.className, "text-sm text-zinc-600")}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Commission only — highlighted */}
          <div className="relative rounded-2xl bg-[#0E1117] p-7 shadow-2xl">
            <span
              className={cn(
                jakarta.className,
                "absolute top-5 right-5 text-[10px] font-semibold bg-white/10 text-white/60 rounded-full px-2.5 py-1"
              )}
            >
              Commission model
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#0C831F]/20 border border-[#0C831F]/25 flex items-center justify-center mb-5">
              <IndianRupee className="w-5 h-5 text-[#4ade80]" />
            </div>
            <h3 className={cn(manrope.className, "font-bold text-white mb-2")}>
              Pay on Earnings
            </h3>
            <p
              className={cn(
                jakarta.className,
                "text-sm text-white/55 mb-5 leading-relaxed"
              )}
            >
              PrintBuddy only charges when a job completes and you&apos;ve been paid.
            </p>
            <div
              className={cn(
                manrope.className,
                "text-[52px] font-extrabold text-white leading-none tracking-[-0.04em] my-5 tabular-nums"
              )}
            >
              5–8%
              <span
                className={cn(
                  jakarta.className,
                  "text-xl font-normal text-white/40"
                )}
              >
                {" "}
                / job
              </span>
            </div>
            <p className={cn(jakarta.className, "text-xs text-white/40 mb-7")}>
              Exact rate agreed at onboarding. Negotiable for high-volume shops.
            </p>
            <Link
              href="/vendor/login"
              className={cn(
                manrope.className,
                "w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0C831F] text-white text-sm font-bold rounded-xl hover:bg-[#086618] transition-colors shadow-lg shadow-[#0C831F]/30"
              )}
            >
              Join Free
            </Link>
          </div>

          {/* Fast payouts */}
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-7">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-5">
              <Banknote className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className={cn(manrope.className, "font-bold text-[#0E1117] mb-2")}>
              Fast Payouts
            </h3>
            <p
              className={cn(
                jakarta.className,
                "text-sm text-zinc-500 mb-5 leading-relaxed"
              )}
            >
              Earnings go directly to your bank account on a daily settlement cycle.
            </p>
            <ul className="space-y-2.5">
              {[
                "Daily bank transfer",
                "Full transaction history",
                "Invoice generation",
                "UPI & bank account support",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0C831F] shrink-0" />
                  <span className={cn(jakarta.className, "text-sm text-zinc-600")}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────

function FAQSection() {
  const faqs = [
    {
      q: "What is Print Buddy digital software?",
      a: "Print Buddy is advanced digital software and print software that transforms any existing printer into an autonomous wireless printing machine. It allows customers to upload documents, pay via UPI, and print directly without passing through WhatsApp, USB drives, or shopkeeper queues.",
    },
    {
      q: "How does Print Buddy function as a printing ATM machine?",
      a: "Just like a cash ATM machine dispenses currency only after you enter a confidential ATM PIN, Print Buddy functions as a secure printing ATM machine. After paying online, the customer receives a 4-digit release code. The print job is held securely and only starts printing when the customer enters this code at the physical counter.",
    },
    {
      q: "Can Print Buddy turn my shop counter into a 24/7 printing vending machine?",
      a: "Yes! Print Buddy's digital software acts as a virtual self-service printing vending machine. Customers scan the QR sticker, configure simplex/duplex or color options, review the locked live rate, pay using any UPI app, and automatically release their prints without any manual counter work.",
    },
    {
      q: "Is Print Buddy print software available for Xerox shops in Yotmal?",
      a: "Yes. Print Buddy is actively deployed across student xerox centres, coaching institutes, and cyber shops in Yotmal (Yavatmal) and across Maharashtra. Shop owners in Yotmal can sign up for free, download the Windows agent, and start receiving automated online print jobs immediately.",
    },
    {
      q: "Do I need to buy a dedicated wireless printing machine to use Print Buddy?",
      a: "No. You do not need to buy any new hardware or expensive kiosks. Print Buddy's print software runs seamlessly on your current Windows PC connected to your existing USB or network printer, converting it into a cloud-connected wireless printing machine.",
    },
    {
      q: "Which printers and file formats are supported?",
      a: "Print Buddy supports any printer compatible with Windows Print Spooler or CUPS on Linux (HP, Canon, Epson, Brother, Ricoh, Xerox, Konica Minolta). Our server-side digital software automatically normalizes PDFs, Word (.docx), PowerPoint (.pptx), and images into print-ready files.",
    },
    {
      q: "What happens if my printer fails mid-job or runs out of paper?",
      a: "If a job cannot complete due to a paper jam or power outage, automated Razorpay refunds are triggered directly to the customer's UPI account — protecting your shop reputation and preventing customer disputes.",
    },
    {
      q: "Are customer documents stored securely or deleted?",
      a: "Customer privacy is strictly protected. Uploaded documents are encrypted, accessible only via short-lived temporary URLs, and automatically shredded and deleted from the server and local printer cache immediately after printing.",
    },
    {
      q: "What if the internet drops at my shop?",
      a: "The Print Buddy agent includes an offline-resilient local SQLite queue. Already-paid jobs remain securely queued and resume printing automatically the instant internet connectivity is restored.",
    },
    {
      q: "How and when do shop owners receive payouts?",
      a: "Earnings are deposited directly to your registered Indian bank account on an automated daily settlement cycle. You can track all job counts, revenue, and payout records live inside your Vendor Dashboard.",
    },
    {
      q: "What is the commission rate for vendors?",
      a: "Print Buddy charges a low 5–8% commission only on successfully completed and paid jobs. There are zero monthly software subscriptions, zero onboarding fees, and zero charges on refunded jobs.",
    },
    {
      q: "Can customers pay with any UPI app?",
      a: "Yes. Customers can pay using Google Pay (GPay), PhonePe, Paytm, BHIM, Amazon Pay, or any bank UPI application via Razorpay.",
    },
  ];

  return (
    <section className="py-24 bg-[#F7F7F5]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-14">
          <div>
            <SectionLabel>FAQ</SectionLabel>
            <SectionHeading>Got questions?</SectionHeading>
            <p
              className={cn(
                jakarta.className,
                "text-zinc-500 text-sm mt-4 leading-relaxed"
              )}
            >
              Can&apos;t find what you&apos;re looking for? Reach out via the{" "}
              <Link href="/support" className="text-[#0C831F] hover:underline">
                support page
              </Link>
              .
            </p>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {faqs.map(({ q, a }) => (
              <div
                key={q}
                className="rounded-2xl bg-white border border-[#E5E5E2] px-6 py-5"
              >
                <h3
                  className={cn(
                    manrope.className,
                    "text-sm font-bold text-[#0E1117] mb-2"
                  )}
                >
                  {q}
                </h3>
                <p className={cn(jakarta.className, "text-sm text-zinc-500 leading-relaxed")}>
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTASection() {
  return (
    <section
      className="py-28 bg-[#0E1117] relative overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(12,131,31,0.12) 0%, transparent 70%)",
        }}
      />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 text-center relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-[#0C831F] mx-auto flex items-center justify-center shadow-2xl shadow-[#0C831F]/30 mb-8">
          <Printer className="w-7 h-7 text-white" />
        </div>
        <h2
          className={cn(
            manrope.className,
            "text-4xl sm:text-5xl font-extrabold text-white tracking-[-0.04em] mb-5"
          )}
          style={{ textWrap: "balance" } as React.CSSProperties}
        >
          Your shop.{" "}
          <span className="text-[#0C831F]">Smarter.</span>
        </h2>
        <p
          className={cn(
            jakarta.className,
            "text-zinc-400 text-lg max-w-md mx-auto mb-12 leading-relaxed"
          )}
        >
          Join PrintBuddy and start serving online print orders — no new equipment, no
          upfront cost, live in minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/vendor/login"
            className={cn(
              manrope.className,
              "inline-flex items-center justify-center gap-2.5 px-9 py-4 bg-[#0C831F] text-white text-sm font-bold rounded-2xl hover:bg-[#086618] transition-colors shadow-2xl shadow-[#0C831F]/30"
            )}
          >
            <Store className="w-4 h-4" />
            Become a Vendor — Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className={cn(
              jakarta.className,
              "inline-flex items-center justify-center gap-2.5 px-9 py-4 border border-white/[0.12] text-zinc-300 text-sm font-medium rounded-2xl hover:border-white/25 hover:text-white transition-all"
            )}
          >
            <Smartphone className="w-4 h-4" />
            Open Customer App
          </Link>
        </div>
        <p className={cn(jakarta.className, "mt-8 text-xs text-zinc-600")}>
          No credit card &nbsp;·&nbsp; No hardware cost &nbsp;·&nbsp; Live in under 5 minutes
        </p>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-[#0E1117] border-t border-white/[0.06]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="py-14 grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-[#0C831F] flex items-center justify-center">
                <Printer className="w-3.5 h-3.5 text-white" />
              </div>
              <span
                className={cn(
                  manrope.className,
                  "text-sm font-bold text-white tracking-tight"
                )}
              >
                PrintBuddy
              </span>
            </Link>
            <p
              className={cn(
                jakarta.className,
                "text-sm text-zinc-500 leading-relaxed max-w-xs"
              )}
            >
              Connecting print shops to the digital economy — one print at a time.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0C831F]" />
              <span className={cn(jakarta.className, "text-xs text-zinc-600")}>
                All systems operational
              </span>
            </div>
          </div>

          {/* Vendors */}
          <div>
            <h4
              className={cn(
                manrope.className,
                "text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-5"
              )}
            >
              Vendors
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Vendor Dashboard", href: "/vendor/login" },
                { label: "Become a Vendor", href: "/vendor/login" },
                { label: "Install Agent", href: "#install" },
                { label: "Pricing", href: "#pricing" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      jakarta.className,
                      "text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customers */}
          <div>
            <h4
              className={cn(
                manrope.className,
                "text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-5"
              )}
            >
              Customers
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Sign In", href: "/login" },
                { label: "Get the App", href: "/login" },
                { label: "Print a Document", href: "/app/print" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      jakarta.className,
                      "text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4
              className={cn(
                manrope.className,
                "text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-5"
              )}
            >
              Company
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Features", href: "#features" },
                { label: "Privacy Policy", href: "/terms#privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Support", href: "/support" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      jakarta.className,
                      "text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="py-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className={cn(jakarta.className, "text-xs text-zinc-600")}>
            © {new Date().getFullYear()} PrintBuddy. All rights reserved.
          </p>
          <p className={cn(jakarta.className, "text-xs text-zinc-600")}>
            Made with care in India
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://printbuddy.in/#software",
        name: "Print Buddy",
        alternateName: [
          "PrintBuddy",
          "Print Buddy Digital Software",
          "Print Software",
          "Wireless Printing Machine Platform",
        ],
        applicationCategory: "BusinessApplication",
        operatingSystem: "Windows 10, Windows 11, Linux, Raspberry Pi",
        description:
          "Print Buddy is cutting-edge digital software and print software turning any Xerox printer into an unattended wireless printing machine, printing ATM machine, and printing vending machine with instant UPI payments.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          description: "Commission-only model — zero upfront hardware cost",
        },
        featureList: [
          "Universal wireless printing machine capability without cables or drivers",
          "Secure printing ATM machine PIN protection for confidential documents",
          "Self-service printing vending machine workflow with instant UPI payments",
          "Digital software running on existing shop Windows PC or Raspberry Pi",
          "Active print shop network in Yotmal and throughout Maharashtra & India",
        ],
        provider: {
          "@type": "Organization",
          name: "PrintBuddy",
          url: "https://printbuddy.in",
        },
      },
      {
        "@type": "LocalBusiness",
        "@id": "https://printbuddy.in/#localbusiness",
        name: "Print Buddy — Wireless Printing Network Yotmal",
        description:
          "Self-serve wireless printing machine and automated digital software network empowering Xerox centres and student hubs in Yotmal, Maharashtra, and India.",
        url: "https://printbuddy.in",
        areaServed: [
          { "@type": "City", name: "Yotmal" },
          { "@type": "AdministrativeArea", name: "Maharashtra" },
          { "@type": "Country", name: "India" },
        ],
        serviceType: "Wireless Printing ATM Machine & Xerox Print Software",
      },
      {
        "@type": "FAQPage",
        "@id": "https://printbuddy.in/#faq",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Print Buddy digital software?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Print Buddy is advanced digital software and print software that transforms any existing printer into an autonomous wireless printing machine. It allows customers to upload documents, pay via UPI, and print directly without passing through WhatsApp, USB drives, or shopkeeper queues.",
            },
          },
          {
            "@type": "Question",
            name: "How does Print Buddy function as a printing ATM machine?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Just like a cash ATM machine dispenses currency only after you enter a confidential ATM PIN, Print Buddy functions as a secure printing ATM machine. After paying online, the customer receives a 4-digit release code. The print job is held securely and only starts printing when the customer enters this code at the physical counter.",
            },
          },
          {
            "@type": "Question",
            name: "Can Print Buddy turn my shop counter into a 24/7 printing vending machine?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes! Print Buddy's digital software acts as a virtual self-service printing vending machine. Customers scan the QR sticker, configure simplex/duplex or color options, review the locked live rate, pay using any UPI app, and automatically release their prints without any manual counter work.",
            },
          },
          {
            "@type": "Question",
            name: "Is Print Buddy print software available for Xerox shops in Yotmal?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Print Buddy is actively deployed across student xerox centres, coaching institutes, and cyber shops in Yotmal (Yavatmal) and across Maharashtra. Shop owners in Yotmal can sign up for free, download the Windows agent, and start receiving automated online print jobs immediately.",
            },
          },
          {
            "@type": "Question",
            name: "Do I need to buy a dedicated wireless printing machine to use Print Buddy?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. You do not need to buy any new hardware or expensive kiosks. Print Buddy's print software runs seamlessly on your current Windows PC connected to your existing USB or network printer, converting it into a cloud-connected wireless printing machine.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <PrintingAtmSection />
        <FeaturesSection />
        <YotmalNetworkSection />
        <ForVendorsSection />
        <InstallSection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </>
  );
}
