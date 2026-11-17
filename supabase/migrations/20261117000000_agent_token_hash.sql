begin;

-- Rename plaintext token column to hash column and invalidate all existing
-- tokens. Agents must re-pair after this migration; the raw token is never
-- stored again.
alter table public.agents rename column agent_token to agent_token_hash;
alter table public.agents alter column agent_token_hash drop not null;
update public.agents set agent_token_hash = null;

commit;
