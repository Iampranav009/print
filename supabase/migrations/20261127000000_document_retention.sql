-- Lists documents that are safe to delete, so the app can remove them through the Storage API
-- (storage.objects rows must not be deleted with SQL; that would leave the files behind).
--
-- A document is expired when no job still needs it, and either:
--   * every job using it finished more than finished_minutes ago, or
--   * no job uses it (an abandoned upload, or an original whose print copy was made)
--     and it is older than orphan_minutes.

-- Unpaid orders past their window move to 'expired' (from the documented state machine).
alter type public.job_status add value if not exists 'expired';

create index if not exists print_jobs_file_path_idx on public.print_jobs (file_path);

create or replace function public.expired_document_paths(
  finished_minutes int,
  orphan_minutes int,
  max_rows int default 500
)
returns table (path text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'documents'
    and not exists (
      select 1 from public.print_jobs active
      where active.file_path = o.name
        and (
          -- text, not enum, so this compiles in the same migration that adds 'expired'
          active.status::text not in ('printed', 'print_failed', 'refunded', 'expired')
          or active.updated_at >= now() - make_interval(mins => finished_minutes)
        )
    )
    and (
      exists (select 1 from public.print_jobs done where done.file_path = o.name)
      or o.created_at < now() - make_interval(mins => orphan_minutes)
    )
  order by o.created_at
  limit max_rows;
$$;

revoke all on function public.expired_document_paths(int, int, int) from public, anon, authenticated;
grant execute on function public.expired_document_paths(int, int, int) to service_role;
