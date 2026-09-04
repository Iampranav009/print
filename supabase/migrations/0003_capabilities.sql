-- Add per-printer capabilities JSONB column.
-- The agent auto-detects from IPP attributes and posts them;
-- this default covers the case before any agent connects.

alter table printers
  add column capabilities jsonb not null default '{
    "color": true,
    "sides": ["one-sided", "two-sided-long-edge", "two-sided-short-edge"],
    "media": ["A4", "A3", "Legal", "A5", "Letter"],
    "number_up": [1, 2, 4],
    "quality": ["draft", "normal", "high"],
    "media_types": ["plain", "glossy", "cardstock"],
    "collate": true,
    "reverse": true,
    "scaling": ["none", "fit-to-page", "shrink-to-fit"],
    "max_copies": 99
  }'::jsonb;
