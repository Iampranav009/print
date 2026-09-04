-- Add print_jobs to the realtime publication so the kiosk screen can
-- subscribe to status changes over Supabase Realtime instead of polling.
-- Safe to run repeatedly — the DO block skips if the table is already in
-- the publication.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'print_jobs'
  ) then
    alter publication supabase_realtime add table print_jobs;
  end if;
end $$;
