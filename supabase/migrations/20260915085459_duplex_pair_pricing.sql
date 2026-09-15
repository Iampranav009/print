begin;
-- Paired front/back sides cost 75% of two separate sides (20 -> 15).
alter table public.pricing alter column duplex_factor set default 0.75;
update public.pricing set duplex_factor = 0.75;
commit;
