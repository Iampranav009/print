-- Extended print-job options and media-type surcharges.

-- New job columns
alter table print_jobs
  add column if not exists number_up    int     not null default 1,
  add column if not exists "collate"    boolean not null default true,
  add column if not exists quality      text    not null default 'normal',
  add column if not exists media_type   text    not null default 'plain',
  add column if not exists reverse      boolean not null default false,
  add column if not exists scaling      text    not null default 'none';

-- Media-type surcharges on pricing (paise per side, added on top)
alter table pricing
  add column if not exists glossy_surcharge_paise    int not null default 0,
  add column if not exists cardstock_surcharge_paise int not null default 0;
