-- Virtual print mode: when a shop is in virtual mode the web backend itself
-- advances jobs through the print pipeline on realistic timers, so the whole
-- flow can be demoed and tested without a real printer or the Python agent.
-- Real shops keep virtual_mode = false and the Python agent drives them.

alter table shops
  add column if not exists virtual_mode boolean not null default false;

-- Flip virtual_mode on for the pilot/demo shop so local development just works.
update shops
set virtual_mode = true
where id = '00000000-0000-0000-0000-000000000001';
