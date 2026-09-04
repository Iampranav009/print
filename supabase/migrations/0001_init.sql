-- PrintBuddy Phase 1 schema
-- ---------------------------------------------------------
-- The Next.js backend connects with the SERVICE-ROLE key,
-- which bypasses RLS. RLS is enabled on every table with a
-- default-deny policy so that anon / public access through
-- the Supabase client is blocked by default.
-- ---------------------------------------------------------

-- Enum ---------------------------------------------------

create type job_status as enum (
  'priced','awaiting_payment','paid','dispatched','awaiting_release',
  'released','printing','printed','payment_failed','print_failed','refunded'
);

-- Tables -------------------------------------------------

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  owner_phone text,
  status text not null default 'active',
  commission_rate numeric not null default 0.10,
  created_at timestamptz default now()
);

create table agents (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) not null,
  agent_token text unique not null,
  platform text,
  last_heartbeat timestamptz,
  status text default 'offline'
);

create table printers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) not null,
  os_printer_name text not null,
  supports_color boolean default true,
  supports_duplex boolean default true,
  status text default 'unknown'
);

create table pricing (
  shop_id uuid primary key references shops(id),
  bw_page_paise int not null default 200,
  color_page_paise int not null default 1000,
  a3_multiplier numeric not null default 2.0,
  duplex_factor numeric not null default 1.0,
  min_charge_paise int not null default 300
);

create table print_jobs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) not null,
  printer_id uuid references printers(id),
  file_path text not null,
  file_mime text,
  pages int not null,
  copies int not null default 1,
  color boolean not null default false,
  orientation text not null default 'portrait',
  paper text not null default 'A4',
  duplex boolean not null default false,
  page_range text,
  price_paise int not null,
  status job_status not null default 'priced',
  release_code text,
  razorpay_order_id text,
  failure_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  print_job_id uuid references print_jobs(id) not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount_paise int,
  status text,
  refund_id text,
  refund_status text,
  created_at timestamptz default now()
);

-- Indexes ------------------------------------------------

create index idx_print_jobs_shop_status on print_jobs (shop_id, status);
create index idx_print_jobs_created_at  on print_jobs (created_at);
create index idx_payments_job           on payments (print_job_id);
create index idx_agents_shop            on agents (shop_id);

-- Auto-update updated_at trigger -------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_print_jobs_updated_at
  before update on print_jobs
  for each row
  execute function set_updated_at();

-- Row Level Security (default-deny) ----------------------
-- The app uses the service-role key which bypasses RLS.
-- These policies block any direct anon/public access.

alter table shops        enable row level security;
alter table agents       enable row level security;
alter table printers     enable row level security;
alter table pricing      enable row level security;
alter table print_jobs   enable row level security;
alter table payments     enable row level security;
