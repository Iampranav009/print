import React from "react";
import Link from "next/link";
import { ChevronRight, FileText, MapPin, Printer, ShieldCheck, Sparkles, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchUserJobs } from "@/lib/jobs";
import { formatRelativeTime } from "@/lib/date-utils";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { LargeTitle } from "@/components/mobile/NavBar";
import { ListGroup, ListRow } from "@/components/mobile/List";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name: string =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "";
  const firstName = name.trim().split(/\s+/)[0];
  const jobs = user ? await fetchUserJobs(user.id, 3) : [];

  return (
    <div className="min-h-full pb-32">
      <LargeTitle
        subtitle={firstName ? `${greeting()}, ${firstName}` : greeting()}
        title="HIMMER"
        right={
          <Link
            href="/app/profile"
            aria-label="Your profile"
            className="glass-card mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-tint active:scale-95"
          >
            {(firstName[0] ?? "H").toUpperCase()}
          </Link>
        }
      />

      <main className="space-y-6 px-4">
        {/* Hero */}
        <Link
          href="/app/scan"
          style={{ touchAction: "manipulation" }}
          aria-label="Scan a printer QR code to start"
          className="group relative block overflow-hidden rounded-[28px] bg-gradient-to-br from-tint to-tint-bright p-6 text-white shadow-[0_18px_48px_rgba(12,131,31,0.30)] transition-transform duration-300 ease-spring active:scale-[0.98]"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" />
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-6 h-52 w-52 rounded-full bg-black/[0.07]" />

          <div className="relative flex min-h-[220px] flex-col justify-between">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-md">
              <Printer className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75">Ready in minutes</p>
              <h2 className="text-[32px] font-bold leading-[1.05] tracking-[-0.04em]">Scan. Pay. Print.</h2>
              <p className="mt-2 max-w-[17rem] text-[15px] leading-6 text-white/85">
                Scan the shop QR, upload your file and collect your pages.
              </p>
              <span className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-5 text-[15px] font-semibold text-tint shadow-sm">
                Start printing
                <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </div>
        </Link>

        {/* Recent prints */}
        {jobs.length > 0 ? (
          <ListGroup
            title="Recent prints"
            action={
              <Link href="/app/history" className="text-[13px] font-semibold text-tint">
                See all
              </Link>
            }
          >
            {jobs.map((job) => (
              <ListRow
                key={job.id}
                href={`/app/history/${job.id}`}
                icon={<FileText className="h-[18px] w-[18px]" aria-hidden />}
                title={job.file_name}
                subtitle={`${job.shop_name} · ${formatRelativeTime(job.created_at)}`}
                trailing={<StatusPill status={job.status} />}
              />
            ))}
          </ListGroup>
        ) : (
          <section>
            <h2 className="mb-2 px-1 text-[13px] font-semibold text-secondary-label">Recent prints</h2>
            <EmptyState
              icon={<Clock className="h-6 w-6" aria-hidden />}
              title="No prints yet"
              subtitle="Your print jobs will show up here."
            />
          </section>
        )}

        {/* Quick actions */}
        <ListGroup title="Quick actions">
          <ListRow
            href="/app/nearby"
            icon={<MapPin className="h-[18px] w-[18px]" aria-hidden />}
            title="Find a printer"
            subtitle="HIMMER shops near you"
          />
          <ListRow
            icon={<Sparkles className="h-[18px] w-[18px]" aria-hidden />}
            iconClassName="bg-zinc-500/10 text-zinc-500"
            title="Doorstep delivery"
            subtitle="Coming soon"
            trailing={
              <span className="rounded-full bg-zinc-500/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">Soon</span>
            }
          />
        </ListGroup>

        <p className="flex items-center justify-center gap-1.5 text-[12px] text-secondary-label">
          <ShieldCheck className="h-4 w-4 text-tint" aria-hidden />
          Files are removed after printing
        </p>
      </main>
    </div>
  );
}
