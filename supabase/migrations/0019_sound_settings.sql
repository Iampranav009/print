-- 0019_sound_settings.sql
-- Operator-configurable sound-box settings (shops) and per-job announcement
-- ACK tracking (print_jobs) for the local agent audio feature.

alter table public.shops
  add column if not exists sound_enabled   boolean  not null default false,
  add column if not exists sound_language  text     not null default 'en',
  add column if not exists sound_volume    integer  not null default 80
                                            check (sound_volume between 0 and 100);

-- Tracks whether a payment_failed announcement has been played by the agent.
-- NULL = pending (never ACKed); non-null = already announced.
alter table public.print_jobs
  add column if not exists sound_ack_at timestamptz;
