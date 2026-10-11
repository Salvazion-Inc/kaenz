-- Kaenz: per-partner Stripe Connect payouts (additive only; safe to re-run).
-- Each partner (yacht owner, captain, marina/port) gets paid into their own
-- Stripe connected account. Shares for partners who have not connected yet are
-- kept on the platform balance and recorded in pending_payouts.

-- 1) Partner -> connected account. Keyed by the Kaenz session user id (text),
--    the same value stored in yacht_listings.created_by / marina_listings.created_by.
create table if not exists public.partner_payout_accounts (
  user_id text primary key,
  stripe_account_id text not null unique,
  api text not null default 'v2',            -- 'v2' (Accounts v2) or 'v1' (fallback)
  transfers_status text not null default 'pending', -- active | pending | restricted | unsupported
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.partner_payout_accounts enable row level security;
-- No policies: only the service role (server) reads/writes this table.

-- 2) Optional explicit payout owners on a yacht listing. When null, the listing
--    creator (created_by) is used for both the owner and the captain share.
alter table public.yacht_listings add column if not exists owner_user_id text;
alter table public.yacht_listings add column if not exists captain_user_id text;

-- 3) Shares retained on the platform until the partner connects Stripe.
create table if not exists public.pending_payouts (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null,
  role text not null check (role in ('owner', 'captain', 'marina_pickup', 'marina_dropoff')),
  partner_user_id text,                      -- null = no Kaenz partner for this share yet
  listing_ref text,                          -- yacht or place id the share belongs to
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  transfer_group text not null,
  source_charge text,                        -- ch_… used as source_transaction
  reason text not null,                      -- no_partner | not_connected | not_ready | transfer_failed
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  stripe_transfer_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (booking_id, role)
);
alter table public.pending_payouts enable row level security;
create index if not exists pending_payouts_partner_pending_idx
  on public.pending_payouts (partner_user_id)
  where status = 'pending';
