-- PrintBuddy pilot seed
-- Run this AFTER the migrations (0001, 0002).
--
-- The agent token below is generated with:
--   select encode(gen_random_bytes(32), 'hex');
-- Copy it into apps/agent/.env as AGENT_TOKEN.

do $$
declare
  _shop_id  uuid := '00000000-0000-0000-0000-000000000001';
  _token    text;
begin
  -- Generate a secure random token
  _token := encode(gen_random_bytes(32), 'hex');

  -- Pilot shop
  insert into shops (id, name, location, owner_phone)
  values (_shop_id, 'Pilot Shop', 'Campus Gate', '9000000000')
  on conflict (id) do nothing;

  -- Default pricing
  insert into pricing (shop_id)
  values (_shop_id)
  on conflict (shop_id) do nothing;

  -- Printer
  insert into printers (shop_id, os_printer_name)
  values (_shop_id, 'HP_LaserJet');

  -- Agent (print the token so it can be copied)
  insert into agents (shop_id, agent_token, platform)
  values (_shop_id, _token, 'linux');

  raise notice '============================================';
  raise notice 'PILOT SHOP ID  : %', _shop_id;
  raise notice 'AGENT TOKEN    : %', _token;
  raise notice '============================================';
  raise notice 'Copy the AGENT TOKEN into apps/agent/.env';
end $$;
