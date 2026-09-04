-- Row Level Security policy: let signed-in users read the print jobs
-- they own via the anon key. Migration 0001 enabled RLS on print_jobs
-- but never added a SELECT policy — so every anon (i.e. non
-- service-role) query returned zero rows, even for the row owner.
--
-- This is what was breaking /app/history: the server component was
-- using the anon cookie-aware client, and the RLS default-deny meant
-- the SELECT came back empty. The app has been patched to use the
-- service-role client for that path, but this policy also unblocks
-- any future client that wants to query print_jobs directly.

drop policy if exists "users read their own jobs" on print_jobs;
create policy "users read their own jobs"
  on print_jobs for select
  using ( auth.uid() = user_id );
