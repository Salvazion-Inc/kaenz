-- DEC-20261022-02 / GOV-TWIN-20261022-1
-- Not applied by the app. Run in the Supabase SQL editor only after this DEC.
-- Steps: signup_started, signup_completed, email_verified, listing_started, listing_submitted.
-- No email, name, or other personal data. Minimal grants: no anon, no authenticated.
-- service_role may select and insert. Update and delete are not granted.

create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  step text not null check (step in (
    'signup_started',
    'signup_completed',
    'email_verified',
    'listing_started',
    'listing_submitted'
  )),
  role text check (role is null or role in ('owner', 'captain', 'marina')),
  created_at timestamptz not null default now()
);

revoke all on table public.funnel_events from anon, authenticated;
grant select, insert on table public.funnel_events to service_role;
