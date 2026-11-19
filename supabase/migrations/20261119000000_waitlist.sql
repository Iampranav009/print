create table if not exists waitlist (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  shop_name   text not null,
  city        text not null,
  message     text,
  created_at  timestamptz not null default now()
);

alter table waitlist enable row level security;
-- insert allowed for anyone (public form); no select/update/delete from client
create policy "public insert" on waitlist for insert with check (true);
