begin;

alter table public.printers
  add column if not exists bw_os_printer_name text,
  add column if not exists color_os_printer_name text;

-- Existing shops keep their current printer for both kinds of job.
update public.printers
set bw_os_printer_name = coalesce(bw_os_printer_name, os_printer_name),
    color_os_printer_name = coalesce(color_os_printer_name, os_printer_name);

create table public.agent_pairings (
  agent_id uuid primary key references public.agents(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz
);
alter table public.agent_pairings enable row level security;
-- Pairing is a server-only operation; neither browser role can read or redeem secrets.
revoke all on public.agent_pairings from public, anon, authenticated;
grant select, insert, update, delete on public.agent_pairings to service_role;

commit;
