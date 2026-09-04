-- Extend job options: duplex_edge, finishings, sides_billed.
-- Migrate media-type surcharges from flat columns to JSONB.

-- New print_jobs columns
alter table print_jobs
  add column if not exists sides_billed int,
  add column if not exists duplex_edge  text    not null default 'long',
  add column if not exists finishings   text[]  not null default '{}';

-- New pricing column: JSONB map of media_type -> surcharge in paise.
-- Default covers the common case; shopkeeper can override via dashboard.
alter table pricing
  add column if not exists media_type_surcharges jsonb not null
    default '{"plain":0,"glossy":500,"cardstock":800}'::jsonb;

-- If the flat columns from 0004 exist, migrate their values then drop them.
-- Using DO block so the migration is safe whether or not 0004 ran.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'pricing' and column_name = 'glossy_surcharge_paise'
  ) then
    update pricing set
      media_type_surcharges = jsonb_build_object(
        'plain',    0,
        'glossy',   glossy_surcharge_paise,
        'cardstock', cardstock_surcharge_paise
      );
    alter table pricing drop column glossy_surcharge_paise;
    alter table pricing drop column cardstock_surcharge_paise;
  end if;
end $$;
