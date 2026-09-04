-- Vendor profiles: extra info about the person who owns a shop. Keyed by
-- Supabase auth user_id so it plugs into Google OAuth without needing a
-- separate password.
--
-- Shops get owner_id (nullable — unclaimed shops are admin-created and
-- waiting for a vendor to accept an invite) plus lat/lng/place_id for the
-- printer's real-world location.
--
-- Fully idempotent: safe to re-run after a partial failure.

-- Ensure the updated_at trigger function exists. Migration 0001 defines it
-- for the initial schema; re-declare here so this migration is safe to run
-- against a database where 0001 never ran (or was rolled back).
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists vendor_profiles (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  full_name   text        not null,
  phone       text        not null,
  address     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table vendor_profiles enable row level security;

drop policy if exists "vendor reads own profile"   on vendor_profiles;
create policy "vendor reads own profile"
  on vendor_profiles for select
  using ( auth.uid() = user_id );

drop policy if exists "vendor updates own profile" on vendor_profiles;
create policy "vendor updates own profile"
  on vendor_profiles for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

drop policy if exists "vendor inserts own profile" on vendor_profiles;
create policy "vendor inserts own profile"
  on vendor_profiles for insert
  with check ( auth.uid() = user_id );

drop trigger if exists trg_vendor_profiles_updated_at on vendor_profiles;
create trigger trg_vendor_profiles_updated_at
  before update on vendor_profiles
  for each row execute function set_updated_at();

-- Shop owner + geo location
alter table shops
  add column if not exists owner_id        uuid references auth.users(id) on delete set null,
  add column if not exists latitude        numeric(9,6),
  add column if not exists longitude       numeric(9,6),
  add column if not exists google_place_id text,
  add column if not exists contact_email   text,
  add column if not exists contact_phone   text;

create index if not exists idx_shops_owner on shops (owner_id) where owner_id is not null;

-- Allow a shop owner to read + update their own shop through the anon key.
-- Customers reading a shop for QR scans still go through the service-role
-- API route, which bypasses RLS. Public reads stay blocked.
drop policy if exists "owner reads own shop"   on shops;
create policy "owner reads own shop"
  on shops for select
  using ( auth.uid() = owner_id );

drop policy if exists "owner updates own shop" on shops;
create policy "owner updates own shop"
  on shops for update
  using ( auth.uid() = owner_id )
  with check ( auth.uid() = owner_id );
