-- Persist the latest vendor-requested kiosk reset so a kiosk that misses the
-- realtime broadcast still resets on its next queue poll.
alter table public.shops
  add column if not exists kiosk_refresh_requested_at timestamptz;
