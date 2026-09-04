-- Attach a Supabase auth user to each print job so the mobile app can show
-- per-user history. Nullable so legacy walk-up jobs (created before auth
-- shipped) still validate. New jobs from the app will always set user_id.

alter table print_jobs
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_print_jobs_user_created
  on print_jobs (user_id, created_at desc)
  where user_id is not null;
