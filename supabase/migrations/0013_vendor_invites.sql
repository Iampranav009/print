-- Admin-generated invite tokens. Flow:
--   1. Admin creates a shop and generates an invite via /api/admin/invites
--   2. Vendor receives the URL /vendor/claim?token=<token>
--   3. Vendor signs in with Google, hits POST /api/vendor/claim
--   4. If token is valid + unclaimed + not expired, shop.owner_id is set
--      to their user_id and the token is marked claimed
--
-- Tokens are single-use and expire after 30 days by default.

create table if not exists vendor_invites (
  token       text        primary key,
  shop_id     uuid        not null references shops(id) on delete cascade,
  email       text,                             -- optional intended recipient
  claimed_by  uuid        references auth.users(id) on delete set null,
  claimed_at  timestamptz,
  expires_at  timestamptz not null default (now() + interval '30 days'),
  created_at  timestamptz not null default now()
);

create index if not exists idx_vendor_invites_shop
  on vendor_invites (shop_id);

alter table vendor_invites enable row level security;
-- Only the service-role key touches this table (admin API + claim API).
-- No end-user policies needed.
