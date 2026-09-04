-- Printer connection & mode. Per-printer test/real toggle and everything a
-- real printer needs (Wi-Fi / USB / Network configuration + heartbeat-based
-- online detection).
--
-- shops.virtual_mode is kept as the shop-level source of truth for the
-- auto-print pipeline (webhook + virtual ticker); this migration keeps that
-- in sync with the printer's own mode column.
--
-- Fully idempotent — safe to re-run.

alter table printers
  add column if not exists mode              text        not null default 'test',
  add column if not exists connection_type   text,        -- 'wifi' | 'usb' | 'network' | null
  add column if not exists host              text,        -- IP or hostname for network printers
  add column if not exists port              int,         -- typ. 9100 for raw JetDirect
  add column if not exists wifi_ssid         text,        -- reference only — vendor's Wi-Fi network
  add column if not exists setup_notes       text,        -- free-form vendor notes
  add column if not exists last_seen_at      timestamptz, -- last heartbeat from the agent
  add column if not exists online            boolean      not null default false;

-- Constrain mode to a small set. Skip if the check already exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'printers_mode_check'
  ) then
    alter table printers
      add constraint printers_mode_check check (mode in ('test', 'real'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'printers_connection_type_check'
  ) then
    alter table printers
      add constraint printers_connection_type_check
      check (connection_type is null or connection_type in ('wifi', 'usb', 'network'));
  end if;
end $$;

create index if not exists idx_printers_online on printers (online) where online = true;

-- Keep the pilot shop in test mode so QR demos keep working without a real
-- printer. In production a vendor flips this to 'real' via the dashboard.
update printers
set mode = 'test'
where shop_id = '00000000-0000-0000-0000-000000000001';

-- Also mirror the pilot shop's printer mode onto shops.virtual_mode so the
-- server-side auto-print pipeline (Razorpay webhook -> virtual ticker) still
-- fires for the demo shop.
update shops
set virtual_mode = true
where id = '00000000-0000-0000-0000-000000000001';
