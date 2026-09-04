-- Add provenance columns and expand the default capability set.

alter table printers
  add column if not exists capabilities_source     text        not null default 'default',
  add column if not exists make_and_model          text,
  add column if not exists capabilities_updated_at timestamptz;

-- Expand the pilot printer's capabilities to the full authoritative default set
-- and stamp its provenance.
update printers
set
  capabilities = '{
    "color": true,
    "sides": ["one-sided","two-sided-long-edge","two-sided-short-edge"],
    "media": ["A4","A3","A5","Legal","Letter"],
    "media_types": ["plain","glossy","cardstock"],
    "number_up": [1,2,4,6,9],
    "quality": ["draft","normal","high"],
    "finishings": ["staple","punch"],
    "collate": true,
    "reverse": true,
    "scaling": ["none","fit-to-page","shrink-to-fit"],
    "max_copies": 99
  }'::jsonb,
  capabilities_source = 'default',
  capabilities_updated_at = now()
where shop_id = '00000000-0000-0000-0000-000000000001';
