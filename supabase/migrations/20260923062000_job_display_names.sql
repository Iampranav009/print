-- A short customer-facing label captured with each job. Never expose the
-- customer's email, phone, document name or release code on the public kiosk.
alter table public.print_jobs
  add column if not exists display_name text;

create index if not exists idx_print_jobs_shop_ready_order
  on public.print_jobs (shop_id, updated_at, id)
  where status in ('dispatched', 'awaiting_release', 'released', 'printing');

-- The database, rather than a kiosk browser, enforces a single physical
-- print slot even if two agent processes race to claim ready work.
create unique index if not exists idx_print_jobs_one_printing_per_shop
  on public.print_jobs (shop_id)
  where status = 'printing';
