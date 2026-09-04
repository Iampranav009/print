-- Bank details for payouts. Kept in a separate table with strict RLS so
-- account numbers never leak through a broad shop query. Only the shop
-- owner + the service-role key can read.
--
-- Consider adding pgcrypto column encryption later — for now RLS + Supabase
-- at-rest encryption is the guarantee.
--
-- Fully idempotent: safe to re-run after a partial failure.

create table if not exists vendor_bank_details (
  shop_id              uuid primary key references shops(id) on delete cascade,
  account_holder_name  text not null,
  account_number       text not null,
  ifsc_code            text not null,
  bank_name            text,
  branch               text,
  upi_id               text,
  verified             boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table vendor_bank_details enable row level security;

drop policy if exists "owner reads own bank details"   on vendor_bank_details;
create policy "owner reads own bank details"
  on vendor_bank_details for select
  using (
    exists (
      select 1 from shops s
      where s.id = vendor_bank_details.shop_id
        and s.owner_id = auth.uid()
    )
  );

drop policy if exists "owner upserts own bank details" on vendor_bank_details;
create policy "owner upserts own bank details"
  on vendor_bank_details for insert
  with check (
    exists (
      select 1 from shops s
      where s.id = vendor_bank_details.shop_id
        and s.owner_id = auth.uid()
    )
  );

drop policy if exists "owner updates own bank details" on vendor_bank_details;
create policy "owner updates own bank details"
  on vendor_bank_details for update
  using (
    exists (
      select 1 from shops s
      where s.id = vendor_bank_details.shop_id
        and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from shops s
      where s.id = vendor_bank_details.shop_id
        and s.owner_id = auth.uid()
    )
  );

drop trigger if exists trg_vendor_bank_details_updated_at on vendor_bank_details;
create trigger trg_vendor_bank_details_updated_at
  before update on vendor_bank_details
  for each row execute function set_updated_at();
