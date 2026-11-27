import React from "react";
import Link from "next/link";
import { ChevronRight, Clock, FileText, MapPin, Printer, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchUserJobs } from "@/lib/jobs";
import { formatRelativeTime } from "@/lib/date-utils";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { TabTopBar } from "@/components/mobile/NavBar";
import { ListGroup, ListRow } from "@/components/mobile/List";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name: string =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "";
  const initial = (name.trim()[0] ?? "").toUpperCase();
  const jobs = user ? await fetchUserJobs(user.id, 3) : [];

  return (
    <div className="min-h-full pb-32">
      <TabTopBar
        title="Home"
        right={
          <Link
            href="/app/profile"
            aria-label="Your profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-tint text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(12,131,31,0.30)] transition-transform active:scale-95"
          >
            {initial || <span aria-hidden>·</span>}
          </Link>
        }
      />

      <main className="space-y-6 px-4 pt-4">
        {/* Start printing */}
        <Link
          href="/app/scan"
          style={{ touchAction: "manipulation" }}
          aria-label="Scan a printer QR code to start"
          className="group relative block overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#0a7a1c_0%,#0c831f_35%,#00ce68_100%)] p-6 text-white shadow-[0_20px_50px_-12px_rgba(12,131,31,0.55)] ring-1 ring-inset ring-white/20 transition-transform duration-300 ease-spring active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint focus-visible:ring-offset-2"
        >
          {/* Glass sheen + soft light pools */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,255,255,0.28),transparent_55%)]" />
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-[2px]" />
          <div className="pointer-events-none absolute -bottom-28 -left-10 h-56 w-56 rounded-full bg-black/10" />
          <Printer
            className="pointer-events-none absolute -bottom-6 -right-6 h-44 w-44 -rotate-12 text-white/[0.08]"
            strokeWidth={1.2}
            aria-hidden
          />

          <div className="relative flex min-h-[220px] flex-col justify-between">
            <span className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/35 bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_20px_rgba(0,0,0,0.10)] backdrop-blur-md">
              <Printer className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75">Ready in minutes</p>
              <h2 className="text-[34px] font-bold leading-[1.02] tracking-[-0.045em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                Scan. Pay. Print.
              </h2>
              <p className="mt-2 max-w-[17rem] text-[15px] leading-6 text-white/85">
                Scan the shop QR, upload your file and collect your pages.
              </p>
              <span className="mt-5 inline-flex min-h-12 items-center gap-3 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-[15px] font-semibold text-tint shadow-[0_10px_24px_rgba(0,0,0,0.14)]">
                Start printing
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tint text-white transition-transform duration-300 ease-spring group-hover:translate-x-0.5 group-active:translate-x-1">
                  <ChevronRight className="h-4 w-4" strokeWidth={2.6} aria-hidden />
                </span>
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
