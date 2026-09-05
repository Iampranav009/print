-- Partner-controlled printer features + auto-discovered OS printer names.
--
-- 1. printers.color_enabled + duplex_enabled: partners can turn off
--    color or double-sided printing regardless of what the hardware
--    supports. Black-and-white simplex is always on.
-- 2. shops.discovered_printers: cache of OS-level printer names the
--    Python agent sees on the shop's machine. The partner UI reads
--    this to populate a dropdown so they don't have to type the name
--    by hand.
--
-- Fully idempotent — safe to re-run.

alter table printers
  add column if not exists color_enabled   boolean not null default true,
  add column if not exists duplex_enabled  boolean not null default true;

alter table shops
  add column if not exists discovered_printers jsonb not null default '[]'::jsonb,
  add column if not exists discovered_at       timestamptz;
