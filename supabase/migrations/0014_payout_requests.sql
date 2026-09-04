-- Vendor-initiated payout requests. A vendor asks the platform to release
-- earned revenue (minus platform fees) to their registered bank account.
--
-- Amounts are stored in paise (integer) to avoid float rounding. The vendor
-- picks an amount at request time; the admin approves, rejects, or marks
-- paid. `platform_fee_paise` captures the ~2% Razorpay share so the ledger
-- stays honest.
--
-- Fully idempotent: safe to re-run.

create table if not exists payout_requests (
  id                  uuid primary key default gen_random_uuid(),
  shop_id             uuid not null references shops(id) on delete cascade,
  requested_by        uuid not null references auth.users(id) on delete set null,
  amount_paise        bigint not null check (amount_paise > 0),
  platform_fee_paise  bigint not null default 0 check (platform_fee_paise >= 0),
  net_payout_paise    bigint not null default 0 check (net_payout_paise >= 0),
  status              text not null default 'pending'
                        check (status in ('pending', 'approved', 'rejected', 'paid')),
  note                text,
  admin_note          text,
  processed_by        uuid references auth.users(id) on delete set null,
  processed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_payout_requests_shop     on payout_requests (shop_id);
create index if not exists idx_payout_requests_status   on payout_requests (status);
create index if not exists idx_payout_requests_created  on payout_requests (created_at desc);

alter table payout_requests enable row level security;

-- Owners can see their own shop's requests
drop policy if exists "owner reads own payouts" on payout_requests;
create policy "owner reads own payouts"
  on payout_requests for select
  using (
    exists (
      select 1 from shops s
      where s.id = payout_requests.shop_id
        and s.owner_id = auth.uid()
    )
  );

-- Owners can create requests for their own shop
drop policy if exists "owner inserts own payouts" on payout_requests;
create policy "owner inserts own payouts"
  on payout_requests for insert
  with check (
    exists (
      select 1 from shops s
      where s.id = payout_requests.shop_id
        and s.owner_id = auth.uid()
    )
  );

-- Admin writes go through the service-role key (bypasses RLS), so no admin
-- policy is required here.

drop trigger if exists trg_payout_requests_updated_at on payout_requests;
create trigger trg_payout_requests_updated_at
  before update on payout_requests
  for each row execute function set_updated_at();
