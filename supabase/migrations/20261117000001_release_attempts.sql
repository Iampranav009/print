begin;
alter table public.print_jobs
  add column if not exists release_attempts integer not null default 0;
commit;
