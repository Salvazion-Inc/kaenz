-- DEC-20261105-01 (zona B under DEC-20261021-02).
-- GOV-PASS-DEC20261105-01-plan / GOV-TWIN-20261105-1 / GOV-FAIL-KNZ26-CODE.
-- Additive captain acceptance for a requested trip. Not applied by the app.
-- Run in the Supabase SQL editor when this change is deployed.
-- The table is unused while CAPTAIN_AUTO_ACCEPT=1.
-- Rollback of the app behavior: set CAPTAIN_AUTO_ACCEPT=1, or git revert the commit.
-- Do not DROP this table without a DEC from Cristian.

create table if not exists public.trip_offers (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  customer_name text not null default '',
  yacht_id text,
  origin_name text not null default '',
  dest_name text not null default '',
  guests int,
  kind text,
  hours numeric,
  status text not null default 'offered'
    check (status in ('offered', 'accepted', 'declined')),
  accepted_by text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint trip_offers_accepted_fields check (
    (
      status = 'accepted'
      and accepted_by is not null
      and accepted_at is not null
    )
    or (
      status <> 'accepted'
      and accepted_by is null
      and accepted_at is null
    )
  )
);

alter table public.trip_offers enable row level security;

create index if not exists trip_offers_open_idx
  on public.trip_offers (status, created_at desc);

create index if not exists trip_offers_user_idx
  on public.trip_offers (user_id, created_at desc);

-- Server-only. The browser reads and writes through /api/offers with the service role.
-- anon and authenticated get nothing. service_role gets DML only, never TRUNCATE or ALL.
revoke all on table public.trip_offers from anon, authenticated;
grant select, insert, update, delete on table public.trip_offers to service_role;

-- GOV-FAIL-KNZ26-CODE. The account holder cannot set this column.
-- /api/profile and /api/join must not write it. Service role only, same grants as profiles.
alter table public.profiles add column if not exists captain_verified boolean not null default false;
