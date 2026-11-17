begin;

-- Invite tokens are now stored as SHA-256 hashes; existing plaintext tokens
-- are invalid against the new comparison logic and must be cleared.
-- Admins must re-issue invites after this migration.
delete from public.vendor_invites where used_at is null;

commit;
