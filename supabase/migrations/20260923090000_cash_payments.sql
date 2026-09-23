-- Shop-controlled cash collection. Online jobs continue to be confirmed only
-- by the signed Razorpay webhook; cash jobs require an authenticated agent
-- decision before they can enter the printer queue.
alter table public.shops
  add column if not exists cash_payments_enabled boolean not null default false,
  add column if not exists default_payment_method text not null default 'online';

alter table public.shops
  drop constraint if exists shops_default_payment_method_check;
alter table public.shops
  add constraint shops_default_payment_method_check
  check (default_payment_method in ('online', 'cash'));

alter table public.print_jobs
  add column if not exists payment_method text not null default 'online',
  add column if not exists cash_decided_at timestamptz,
  add column if not exists cash_decided_by uuid references public.agents(id) on delete set null;

alter table public.print_jobs
  drop constraint if exists print_jobs_payment_method_check;
alter table public.print_jobs
  add constraint print_jobs_payment_method_check
  check (payment_method in ('online', 'cash'));

alter table public.payments
  add column if not exists payment_method text not null default 'online',
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by_agent_id uuid references public.agents(id) on delete set null;

alter table public.payments
  drop constraint if exists payments_payment_method_check;
alter table public.payments
  add constraint payments_payment_method_check
  check (payment_method in ('online', 'cash'));

create unique index if not exists idx_payments_one_per_job
  on public.payments (print_job_id);

create index if not exists idx_print_jobs_cash_waiting
  on public.print_jobs (shop_id, created_at)
  where payment_method = 'cash' and status = 'awaiting_payment';
