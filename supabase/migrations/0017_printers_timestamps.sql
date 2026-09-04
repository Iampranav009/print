-- Add created_at and updated_at timestamps to printers table.
-- Fully idempotent — safe to re-run.

alter table printers
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Auto-update updated_at trigger
drop trigger if exists trg_printers_updated_at on printers;
create trigger trg_printers_updated_at
  before update on printers
  for each row
  execute function set_updated_at();
