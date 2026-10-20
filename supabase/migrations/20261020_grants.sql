-- Explicit Data API grants (Supabase rule, 30 Oct 2026).
-- New public tables are not exposed until granted. These three stay server-only:
-- anon and authenticated lose every privilege; service_role gets DML only.
-- TRUNCATE is intentionally omitted.
-- Not applied by the app. Run in the Supabase SQL editor when ready.

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.partner_payout_accounts from anon, authenticated;
revoke all on table public.pending_payouts from anon, authenticated;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.partner_payout_accounts to service_role;
grant select, insert, update, delete on table public.pending_payouts to service_role;
