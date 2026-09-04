import type { Metadata } from "next";
import Link from "next/link";
import {
  Printer,
  QrCode,
  Smartphone,
  BarChart3,
  ShieldCheck,
  Banknote,
  Wifi,
  Star,
  ChevronRight,
  Download,
  Store,
  Zap,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  MonitorSmartphone,
  Package,
  IndianRupee,
  Settings,
  Lock,
  ArrowUpRight,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── SEO Metadata ──────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "PrintBuddy — The Smart Print Network for Shops Across India",
  description:
    "PrintBuddy transforms your existing print shop into a 24/7 connected print node. Zero hardware cost. Students pay online, you just print. Join 500+ shops earning with PrintBuddy.",
  keywords: [
    "print shop software India",
    "xerox shop management app",
    "self-serve printing kiosk",
    "vendor print dashboard",
    "UPI print payment",
    "student printing PWA",
    "automatic print agent software",
    "digital print shop",
    "PrintBuddy vendor",
    "print shop dashboard",
    "online print order system",
    "Razorpay printing",
  ],
  authors: [{ name: "PrintBuddy" }],
  creator: "PrintBuddy",
  publisher: "PrintBuddy",
  openGraph: {
    title: "PrintBuddy — The Smart Print Network for Shops Across India",
    description:
      "Transform your existing print shop into a connected print node. Customers scan, pay online, you print. Zero hardware cost. Join 500+ shops on PrintBuddy.",
    type: "website",
    locale: "en_IN",
    siteName: "PrintBuddy",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrintBuddy — Smart Print Shop Software for India",
    description:
      "Scan. Pay. Print. Automate your print shop with PrintBuddy. No special hardware needed.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-white/80">
      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
        <CheckCircle2 className="w-3 h-3 text-white" />
      </span>
      {children}
    </li>
  );
}

function FeatureCheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-gray-600">
      <CheckCircle2 className="w-4 h-4 text-[#0C831F] shrink-0 mt-0.5" />
      {children}
    </li>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50 border-b border-gray-200 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0C831F] flex items-center justify-center">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-bold text-gray-900 tracking-tight">PrintBuddy</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            <Link href="#how-it-works" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              How it works
            </Link>
            <Link href="#features" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </Link>
            <Link href="#install" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Install
            </Link>
            <Link href="#pricing" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Customer App
            </Link>
            <div className="ml-2 pl-3 border-l border-gray-200 flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/vendor/login"
                className="px-4 py-2 text-sm font-semibold bg-[#0C831F] hover:bg-[#086618] text-white rounded-lg transition-colors"
              >
                Vendor Portal
              </Link>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="flex lg:hidden items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg">
              Sign In
            </Link>
            <Link href="/vendor/login" className="px-3 py-1.5 text-xs font-semibold bg-[#0C831F] text-white rounded-lg">
              Vendor
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative bg-[#f9faf8] pt-28 pb-0 overflow-hidden">
      <div className="max-w-3xl mx-auto px-4 text-center mb-14">
        {/* Announcement pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0C831F]/10 border border-[#0C831F]/20 text-[#0C831F] text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0C831F] animate-pulse inline-block" />
          500+ shops are live on PrintBuddy!
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-5 tracking-tight">
          The platform that powers{" "}
          <span className="text-[#0C831F]">your print shop</span>
        </h1>

        <p className="text-gray-500 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          PrintBuddy brings customers and print shops together — from scan to
          printout, all in one seamless, cashless flow.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <Link
            href="/vendor/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-700 transition-colors"
          >
            <Store className="w-4 h-4" />
            Join as a Vendor
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-full hover:border-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            Open Customer App
          </Link>
          <Link
            href="#install"
            className="inline-flex items-center gap-2 px-7 py-3.5 border border-[#0C831F]/40 text-[#0C831F] text-sm font-semibold rounded-full hover:bg-[#0C831F]/5 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download App
          </Link>
        </div>
      </div>

      {/* Dashboard preview card strip */}
      <div className="relative w-full overflow-hidden pb-10">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#f9faf8] to-transparent z-10 pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#f9faf8] to-transparent z-10 pointer-events-none" />

        {/* Scrolling dashboard cards */}
        <div className="flex gap-4 w-max">
          <div className="flex gap-4 shrink-0 animate-[marquee_60s_linear_infinite]">
            {dashboardCards.map((card, i) => (
              <DashboardCard key={i} {...card} />
            ))}
          </div>
          {/* Duplicate for seamless loop */}
          <div className="flex gap-4 shrink-0 animate-[marquee_60s_linear_infinite]" aria-hidden="true">
            {dashboardCards.map((card, i) => (
              <DashboardCard key={`dup-${i}`} {...card} />
            ))}
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }
      `}</style>
    </section>
  );
}

const dashboardCards = [
  {
    shop: "Campus Xerox, Pune",
    jobs: 23,
    revenue: "₹1,240",
    status: "Online",
    color: "bg-emerald-50 border-emerald-100",
    iconColor: "text-[#0C831F]",
  },
  {
    shop: "QuickPrint, Bengaluru",
    jobs: 47,
    revenue: "₹2,890",
    status: "Printing",
    color: "bg-blue-50 border-blue-100",
    iconColor: "text-blue-600",
  },
  {
    shop: "Prakash Xerox, Nagpur",
    jobs: 11,
    revenue: "₹680",
    status: "Online",
    color: "bg-emerald-50 border-emerald-100",
    iconColor: "text-[#0C831F]",
  },
  {
    shop: "VIT Copies, Chennai",
    jobs: 88,
    revenue: "₹5,120",
    status: "Busy",
    color: "bg-amber-50 border-amber-100",
    iconColor: "text-amber-600",
  },
  {
    shop: "Easy Print, Hyderabad",
    jobs: 34,
    revenue: "₹1,960",
    status: "Online",
    color: "bg-emerald-50 border-emerald-100",
    iconColor: "text-[#0C831F]",
  },
  {
    shop: "Anand Copies, Delhi",
    jobs: 19,
    revenue: "₹950",
    status: "Online",
    color: "bg-emerald-50 border-emerald-100",
    iconColor: "text-[#0C831F]",
  },
  {
    shop: "Flash Print, Mumbai",
    jobs: 62,
    revenue: "₹3,440",
    status: "Printing",
    color: "bg-blue-50 border-blue-100",
    iconColor: "text-blue-600",
  },
];

function DashboardCard({
  shop,
  jobs,
  revenue,
  status,
  color,
  iconColor,
}: {
  shop: string;
  jobs: number;
  revenue: string;
  status: string;
  color: string;
  iconColor: string;
}) {
  const statusColors: Record<string, string> = {
    Online: "bg-emerald-100 text-emerald-700",
    Printing: "bg-blue-100 text-blue-700",
    Busy: "bg-amber-100 text-amber-700",
  };

  return (
    <div
      className={cn(
        "shrink-0 w-64 rounded-2xl border p-5 shadow-sm",
        color
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <Printer className={cn("w-4 h-4", iconColor)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900 leading-tight">{shop}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> Live Shop
            </p>
          </div>
        </div>
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusColors[status])}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-gray-900">{jobs}</p>
          <p className="text-[10px] text-gray-400">Jobs Today</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-[#0C831F]">{revenue}</p>
          <p className="text-[10px] text-gray-400">Revenue</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0C831F]"
            style={{ width: `${Math.min(100, (jobs / 100) * 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-400">{jobs}/100</span>
      </div>
    </div>
  );
}

// ─── Trust Bar ─────────────────────────────────────────────────────────────────

function TrustBar() {
  const stats = [
    { value: "500+", label: "Partner Shops" },
    { value: "50K+", label: "Prints / Month" },
    { value: "₹2L+", label: "Monthly Revenue" },
    { value: "4.9 ★", label: "Vendor Rating" },
  ];

  return (
    <div className="mt-16 pt-8 border-t border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-8 py-6">
          <span className="text-sm text-gray-400 font-medium">Trusted by shops across</span>
          {["Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Nagpur", "Chennai"].map((city) => (
            <div key={city} className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
              <MapPin className="w-3 h-3 text-[#0C831F]" />
              {city}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-t border-gray-100">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: QrCode,
      title: "Customer Scans QR",
      desc: "Your unique QR code is on your counter. Customers scan it with their phone — no app install required.",
    },
    {
      number: "02",
      icon: Smartphone,
      title: "Upload & Configure",
      desc: "Select document, choose B&W or colour, single/double-sided, paper size, and number of copies.",
    },
    {
      number: "03",
      icon: IndianRupee,
      title: "Pays via UPI",
      desc: "Exact locked price is shown upfront. Customer pays instantly via GPay, PhonePe, BHIM, or any UPI app.",
    },
    {
      number: "04",
      icon: Printer,
      title: "Auto-Prints at Shop",
      desc: "PrintBuddy's agent auto-receives and prints. Customer enters a 4-digit code to release the job.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-[#0C831F] uppercase tracking-widest mb-3">
            Zero friction
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            How PrintBuddy works
          </h2>
          <p className="text-gray-500 text-base mt-4 max-w-xl mx-auto">
            A seamless flow from scan to printout — no cashier, no USB drives, no waiting in queues.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group rounded-2xl border border-gray-100 hover:border-[#0C831F]/30 hover:shadow-md transition-all duration-300 bg-white p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-[#0C831F]/40 tabular-nums">{step.number}</span>
                <div className="w-10 h-10 rounded-xl bg-[#0C831F]/10 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-[#0C831F]" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/vendor/login"
            className="inline-flex items-center gap-2 px-7 py-3 bg-[#0C831F] text-white text-sm font-semibold rounded-lg hover:bg-[#086618] transition-colors"
          >
            Get started free
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Features Section ──────────────────────────────────────────────────────────

function FeaturesSection() {
  const cards = [
    {
      icon: Zap,
      bg: "bg-amber-50",
      iconColor: "text-amber-500",
      title: "Auto Job Dispatch",
      desc: "Paid jobs are pushed straight to your printer via Supabase Realtime. No manual action ever needed.",
    },
    {
      icon: Lock,
      bg: "bg-blue-50",
      iconColor: "text-blue-500",
      title: "4-Digit Release Code",
      desc: "Prints only release when the customer is physically at your shop and enters their secret code.",
    },
    {
      icon: IndianRupee,
      bg: "bg-[#0C831F]/10",
      iconColor: "text-[#0C831F]",
      title: "Locked UPI Price",
      desc: "Exact price shown before payment — no disputes, no rounding surprises.",
    },
    {
      icon: BarChart3,
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      title: "Live Analytics",
      desc: "Track daily prints, revenue, B&W vs colour, and job history in real time.",
    },
    {
      icon: Wifi,
      bg: "bg-rose-50",
      iconColor: "text-rose-500",
      title: "Offline Resilient",
      desc: "Already-paid jobs print even if internet drops mid-shift via local SQLite queue.",
    },
    {
      icon: ShieldCheck,
      bg: "bg-teal-50",
      iconColor: "text-teal-500",
      title: "Auto Refunds",
      desc: "Paper jam? Power cut? 1-tap Razorpay refunds keep customers happy automatically.",
    },
    {
      icon: Settings,
      bg: "bg-gray-50",
      iconColor: "text-gray-500",
      title: "Flexible Pricing",
      desc: "Set your own rates for B&W, colour, A4/A3, and duplex discounts — change anytime.",
    },
    {
      icon: Printer,
      bg: "bg-sky-50",
      iconColor: "text-sky-500",
      title: "Any Printer Works",
      desc: "No vendor SDKs. Uses standard OS print spoolers — CUPS on Linux, Windows Spooler on PC.",
    },
  ];

  return (
    <section id="features" className="py-20 bg-[#f9faf8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-[#0C831F] uppercase tracking-widest mb-3">
            features
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Everything your shop needs
          </h2>
          <p className="text-gray-500 text-base mt-4 max-w-xl mx-auto">
            Purpose-built for Xerox and print shops in India — battle-tested for power cuts,
            exam season rush, and everything in between.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {cards.map((card) => (
            <div
              key={card.title}
              className="group rounded-2xl border border-gray-100 hover:border-[#0C831F]/30 hover:shadow-md transition-all duration-300 bg-white"
            >
              <div className="p-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", card.bg)}>
                  <card.icon className={cn("w-5 h-5", card.iconColor)} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/vendor/login"
            className="inline-flex items-center gap-2 px-7 py-3 bg-[#0C831F] text-white text-sm font-semibold rounded-lg hover:bg-[#086618] transition-colors"
          >
            Explore now
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Full-width Green CTA ("Why Join") ─────────────────────────────────────────

function WhyJoinSection() {
  return (
    <section className="bg-[#0C831F] py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Left — Dashboard mockup */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-100">
              {/* Mock header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0C831F] flex items-center justify-center">
                    <Printer className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">PrintBuddy Dashboard</span>
                </div>
                <span className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 font-semibold rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Live
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 p-5">
                {[
                  { label: "Today", value: "47", sub: "jobs" },
                  { label: "Revenue", value: "₹2.8K", sub: "earned" },
                  { label: "Pages", value: "312", sub: "printed" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{s.value}</p>
                    <p className="text-[10px] text-gray-400">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Job list */}
              <div className="px-5 pb-5 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Print Queue</p>
                {[
                  { name: "Arjun K.", pages: 4, status: "Printing", color: "text-blue-600 bg-blue-50" },
                  { name: "Meera S.", pages: 12, status: "Paid", color: "text-emerald-700 bg-emerald-50" },
                  { name: "Ravi P.", pages: 2, status: "Waiting", color: "text-amber-700 bg-amber-50" },
                  { name: "Priya J.", pages: 8, status: "Done", color: "text-gray-500 bg-gray-50" },
                ].map((job) => (
                  <div key={job.name} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0C831F]/10 flex items-center justify-center text-[9px] font-bold text-[#0C831F]">
                        {job.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-800">{job.name}</p>
                        <p className="text-[10px] text-gray-400">{job.pages} pages</p>
                      </div>
                    </div>
                    <span className={cn("text-[10px] font-semibold rounded-full px-2 py-0.5", job.color)}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0C831F]/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#0C831F]" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">+62% revenue</div>
                <div className="text-xs text-gray-500">vs. walk-in only</div>
              </div>
            </div>
          </div>

          {/* Right — Copy */}
          <div className="text-white">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-4">
              For Shop Owners
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight">
              Grow your print business{" "}
              <span className="text-white/80">without new hardware</span>
            </h2>
            <p className="text-white/70 text-base mb-8 leading-relaxed">
              PrintBuddy connects your existing printer and PC to thousands of students and
              customers in your area. They order online, you just print. No kiosk, no capital cost.
            </p>
            <ul className="space-y-4 mb-10">
              <CheckItem>Use your existing printer and Windows PC — zero new hardware</CheckItem>
              <CheckItem>Automatic job dispatch via outbound WebSocket — no port forwarding needed</CheckItem>
              <CheckItem>Payments settled directly to your bank account daily</CheckItem>
              <CheckItem>Real-time shop dashboard visible from any device</CheckItem>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/vendor/login"
                className="inline-flex items-center gap-2 px-7 py-3 bg-white text-[#0C831F] text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Store className="w-4 h-4" />
                Open Vendor Dashboard
              </Link>
              <Link
                href="#install"
                className="inline-flex items-center gap-2 px-7 py-3 border border-white/30 text-white text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                <Download className="w-4 h-4" />
                Install Agent
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Install Section ────────────────────────────────────────────────────────────

function InstallSection() {
  const tiers = [
    {
      icon: MonitorSmartphone,
      badge: "Recommended · Most shops",
      title: "Tier 0 — Zero Hardware",
      subtitle: "Your existing Windows PC + Printer",
      desc: "Download and run the PrintBuddy Print Agent on the shop's existing PC. Live in under 5 minutes.",
      features: [
        "Runs on Windows 10 or 11",
        "Works with any USB or network printer",
        "Outbound WebSocket — no port forwarding",
        "Auto-updates silently in background",
        "Local SQLite fallback queue",
      ],
      cta: "Download for Windows",
      ctaHref: "#download-agent",
      ctaIcon: Download,
      highlight: true,
    },
    {
      icon: Package,
      badge: "For shops without a spare PC",
      title: "Tier 1 — Headless Node",
      subtitle: "Raspberry Pi 4 (dedicated device)",
      desc: "We ship a pre-configured Raspberry Pi that plugs straight into your printer — zero setup.",
      features: [
        "Pre-paired to your shop account",
        "Runs CUPS on Linux — universal",
        "24/7 uptime with auto-restart",
        "Fits in your counter — palm-sized",
        "Power-loss recovery built in",
      ],
      cta: "Request a Pi Kit",
      ctaHref: "/vendor/login",
      ctaIcon: Package,
      highlight: false,
    },
  ];

  return (
    <section id="install" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-[#0C831F] uppercase tracking-widest mb-3">
            software-first
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Install PrintBuddy
          </h2>
          <p className="text-gray-500 text-base mt-4 max-w-xl mx-auto">
            Get your shop online in under 5 minutes. No new hardware required — use the PC you already have.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.title}
              className={cn(
                "rounded-2xl border-2 p-7 transition-all duration-300",
                tier.highlight
                  ? "border-[#0C831F]/30 bg-[#f9faf8]"
                  : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
              )}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#0C831F]/10 flex items-center justify-center">
                  <tier.icon className="w-6 h-6 text-[#0C831F]" />
                </div>
                <span className="text-[11px] font-semibold bg-gray-100 text-gray-500 rounded-full px-3 py-1">
                  {tier.badge}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900">{tier.title}</h3>
              <p className="text-sm text-[#0C831F] font-medium mt-0.5">{tier.subtitle}</p>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">{tier.desc}</p>

              <ul className="mt-4 space-y-2.5">
                {tier.features.map((f) => (
                  <FeatureCheckItem key={f}>{f}</FeatureCheckItem>
                ))}
              </ul>

              <div className="mt-6 pt-5 border-t border-gray-100">
                <Link
                  href={tier.ctaHref}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg transition-colors",
                    tier.highlight
                      ? "bg-[#0C831F] text-white hover:bg-[#086618]"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <tier.ctaIcon className="w-4 h-4" />
                  {tier.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Customer PWA install card */}
        <div className="rounded-2xl border-2 border-dashed border-[#0C831F]/30 p-7 sm:p-9 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-[#0C831F] flex items-center justify-center shadow-lg shadow-[#0C831F]/30 flex-shrink-0">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-gray-900">PrintBuddy Customer App (PWA)</h3>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              No App Store needed. Customers open <strong>printbuddy.in</strong> in their mobile browser
              and tap <strong>"Add to Home Screen"</strong>. Instant install — works on Android and iOS.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              {["Android Chrome", "Safari (iOS)", "No app store", "Instant install"].map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-500 rounded-full px-2.5 py-1 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0 items-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Open Customer App
            </Link>
            <p className="text-[11px] text-gray-400">Tap &quot;Add to Home Screen&quot; after opening</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ───────────────────────────────────────────────────────────────────

function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-[#f9faf8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-[#0C831F] uppercase tracking-widest mb-3">
            simple pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            You earn. We take a small cut.
          </h2>
          <p className="text-gray-500 text-base mt-4 max-w-xl mx-auto">
            No monthly fees, no setup costs. PrintBuddy charges a commission only when you earn.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#0C831F]/10 flex items-center justify-center mb-4">
              <Settings className="w-5 h-5 text-[#0C831F]" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">You Set the Price</h3>
            <p className="text-sm text-gray-500 mb-4">Configure your own rates for every print type.</p>
            <ul className="space-y-2">
              <FeatureCheckItem>Per-page B&W rate</FeatureCheckItem>
              <FeatureCheckItem>Per-page colour rate</FeatureCheckItem>
              <FeatureCheckItem>A3 paper size multiplier</FeatureCheckItem>
              <FeatureCheckItem>Duplex discounts</FeatureCheckItem>
            </ul>
          </div>

          {/* Highlighted */}
          <div className="relative rounded-2xl bg-[#0C831F] p-6 shadow-lg shadow-[#0C831F]/30">
            <span className="absolute top-4 right-4 text-[11px] font-semibold bg-white/20 text-white rounded-full px-2.5 py-1">
              Most popular
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-white mb-2">Commission Only</h3>
            <p className="text-sm text-white/80 mb-4">PrintBuddy only charges when you earn.</p>
            <div className="text-4xl font-extrabold text-white my-4">
              ~5–8%
              <span className="text-xl font-normal text-white/60"> / job</span>
            </div>
            <p className="text-xs text-white/60 mb-6">Exact rate set at onboarding. Negotiable for high-volume shops.</p>
            <Link
              href="/vendor/login"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#0C831F] text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <Banknote className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Fast Payouts</h3>
            <p className="text-sm text-gray-500 mb-4">Earnings go directly to your bank account.</p>
            <ul className="space-y-2">
              <FeatureCheckItem>Daily bank transfer</FeatureCheckItem>
              <FeatureCheckItem>Full transaction history</FeatureCheckItem>
              <FeatureCheckItem>Invoice generation</FeatureCheckItem>
              <FeatureCheckItem>UPI & bank account</FeatureCheckItem>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ──────────────────────────────────────────────────────────────

function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "Before PrintBuddy, students came at rush hour with USB drives and held up the whole queue. Now they pre-upload and pay from their hostel. My throughput doubled.",
      name: "Prakash S.",
      shop: "Prakash Xerox Centre, Pune",
      rating: 5,
    },
    {
      quote:
        "Setup was shockingly easy. Downloaded the agent, logged in, and I was live in under 10 minutes. First online order came within an hour.",
      name: "Lakshmi K.",
      shop: "Campus Copies, Hyderabad",
      rating: 5,
    },
    {
      quote:
        "The analytics dashboard alone is worth it. I now know exactly when my peak hours are and which paper size is most popular. Never flying blind.",
      name: "Mohammed R.",
      shop: "QuickPrint, Bengaluru",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-[#0C831F] uppercase tracking-widest mb-3">
            testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Loved by real vendors
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#f59e0b] text-[#f59e0b]" />
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">"{t.quote}"</p>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-400">{t.shop}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────

function FAQSection() {
  const faqs = [
    {
      q: "Do I need to buy new hardware?",
      a: "No. PrintBuddy works with your existing Windows PC and printer. Just download the Print Agent software and you're live.",
    },
    {
      q: "What printers does PrintBuddy support?",
      a: "Any printer that works with your Windows Print Spooler or CUPS on Linux. No vendor-specific drivers needed.",
    },
    {
      q: "How are refunds handled if my printer fails?",
      a: "If a job can't complete, the backend supports automated or 1-tap Razorpay refunds — keeping the customer happy and your reputation intact.",
    },
    {
      q: "Is the customer's document stored permanently?",
      a: "No. Documents are deleted immediately after printing. Privacy is a core design principle.",
    },
    {
      q: "What if my internet drops mid-shift?",
      a: "The Print Agent holds a local SQLite queue. Already-paid jobs are saved locally and print automatically when connectivity returns.",
    },
    {
      q: "How do I get paid?",
      a: "Earnings are deposited directly to your registered bank account. Track every job and payout in your Vendor Dashboard.",
    },
  ];

  return (
    <section className="py-20 bg-[#f9faf8]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-[#0C831F] uppercase tracking-widest mb-3">
            faq
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Got questions?
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map(({ q, a }) => (
            <div key={q} className="rounded-2xl bg-white border border-gray-100 px-6 py-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">{q}</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTASection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#0C831F] mx-auto flex items-center justify-center shadow-xl shadow-[#0C831F]/30 mb-8">
          <Printer className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
          Your shop. <span className="text-[#0C831F]">Smarter.</span>
        </h2>
        <p className="mt-4 text-lg text-gray-500 max-w-lg mx-auto">
          Join PrintBuddy today and start earning from online print orders in minutes —
          no new equipment, no upfront cost.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/vendor/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-700 transition-colors"
          >
            <Store className="w-4 h-4" />
            Become a Vendor — Free
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-gray-300 text-gray-700 text-sm font-semibold rounded-full hover:border-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            Open Customer App
          </Link>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          No credit card &nbsp;·&nbsp; No hardware cost &nbsp;·&nbsp; Live in 5 minutes
        </p>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#0C831F] flex items-center justify-center">
                <Printer className="w-4 h-4 text-white" />
              </div>
              <span className="text-[15px] font-bold text-gray-900">PrintBuddy</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              Connecting print shops with the digital economy — one print at a time.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0C831F] inline-block" />
              All systems operational
            </div>
          </div>

          {/* For Vendors */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">Vendors</h4>
            <ul className="space-y-2.5 text-sm text-gray-500">
              <li><Link href="/vendor/login" className="hover:text-gray-900 transition-colors">Vendor Dashboard</Link></li>
              <li><Link href="/vendor/login" className="hover:text-gray-900 transition-colors">Become a Vendor</Link></li>
              <li><Link href="#install" className="hover:text-gray-900 transition-colors">Install Agent</Link></li>
              <li><Link href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* For Customers */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">Customers</h4>
            <ul className="space-y-2.5 text-sm text-gray-500">
              <li><Link href="/login" className="hover:text-gray-900 transition-colors">Sign In</Link></li>
              <li><Link href="/login" className="hover:text-gray-900 transition-colors">Get the App (PWA)</Link></li>
              <li><Link href="/app/print" className="hover:text-gray-900 transition-colors">Print a Document</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm text-gray-500">
              <li><Link href="#features" className="hover:text-gray-900 transition-colors">Features</Link></li>
              <li><Link href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-gray-900 transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-gray-900 transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="py-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <p>© {new Date().getFullYear()} PrintBuddy. All rights reserved.</p>
          <p>Made with ❤️ in India</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "PrintBuddy",
            description:
              "PrintBuddy connects print shops with customers through a self-serve online print ordering system with UPI payments and auto-printing.",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Windows, Linux",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "INR",
              description: "Commission-only model — no monthly fees",
            },
            provider: { "@type": "Organization", name: "PrintBuddy" },
          }),
        }}
      />

      <Navbar />
      <main id="main-content">
        <HeroSection />
        <TrustBar />
        <HowItWorksSection />
        <FeaturesSection />
        <WhyJoinSection />
        <InstallSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </>
  );
}
