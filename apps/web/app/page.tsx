import { Printer, QrCode, CreditCard, PackageCheck } from "lucide-react";

const steps = [
  {
    icon: QrCode,
    label: "Scan",
    desc: "Scan the QR code at your print shop",
  },
  {
    icon: Printer,
    label: "Upload & configure",
    desc: "Choose your file and print settings",
  },
  {
    icon: CreditCard,
    label: "Pay",
    desc: "Secure payment in seconds",
  },
  {
    icon: PackageCheck,
    label: "Collect",
    desc: "Pick up your printout at the counter",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-16 gap-12">
      {/* Brand hero */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/25">
          <Printer className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            PrintBuddy
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base">
            Self-serve printing, simplified
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-2.5">
        <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase text-center mb-1">
          How it works
        </p>
        {steps.map((step, i) => (
          <div
            key={step.label}
            className="flex items-center gap-4 bg-white dark:bg-zinc-900 rounded-2xl px-5 py-4 border border-zinc-100 dark:border-zinc-800"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center flex-shrink-0">
              <step.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug">
                {step.label}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                {step.desc}
              </p>
            </div>
            <span className="text-xs font-bold text-zinc-200 dark:text-zinc-700 tabular-nums flex-shrink-0">
              0{i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Hint */}
      <p className="text-xs text-center text-zinc-400 dark:text-zinc-600 max-w-[240px] leading-relaxed">
        Scan the QR code at your nearest PrintBuddy shop to get started
      </p>
    </main>
  );
}
