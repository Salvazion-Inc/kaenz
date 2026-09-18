# Kaenz

Leave the car and travel by yacht. Kaenz is an end-to-end platform — not a charter operator — for Commute, Tour, and Special Occasion trips on yachts worldwide.

This is the **origin platform** rebuilt from [kaenz.com](https://kaenz.com/) (Canva site) as a Next.js app.

## Stack

- **Next.js 15** — site + booking + concierge
- **Canva** — original brand, logo, website copy, and video
- **Grok (xAI)** — trip concierge (`grok-4.6`)
- **Supabase** — bookings and captain/owner applications
- **Stripe** — Checkout for the algorithm fare, optional captain gratuity, and recorded marketplace split
- **GitHub + Vercel** — source and deploy

## Brand (from Canva)

- Cyan `#00a1d6`
- Navy `#050a30`
- Foam `#f4f6fc`
- English: *Skip the traffic. Travel by yacht.*
- Spanish: *Salta el tráfico. Viaja en yate.*

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Spanish: `/es`.

The Uber-style app (web + installable mobile PWA) lives at `/app` with five tabs:

1. **Places** — marinas, ports, and featured places worldwide, ordered by GPS
2. **Yachts** — verified captains near you
3. **Your Trip** — request a yacht, pay, and follow the trip
4. **Crew** — social feed for the water
5. **Account** — profile, payments, and trip calendar

Add to Home Screen on iOS/Android for the standalone mobile shell.

## Environment

| Variable | Purpose |
| --- | --- |
| `XAI_API_KEY` | Grok concierge (server-only) |
| `NEXT_PUBLIC_MAP_API_KEY` | CARTO basemap key for the Kaenz map |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional server writes |
| `STRIPE_SECRET_KEY` | Stripe Checkout (server) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature |
| `STRIPE_CONNECT_OWNER` | Optional Connect account for owner payouts |
| `STRIPE_CONNECT_CAPTAIN` | Optional Connect account for captain payouts |
| `STRIPE_CONNECT_MARINA_PICKUP` | Optional Connect account for pickup marina |
| `STRIPE_CONNECT_MARINA_DROPOFF` | Optional Connect account for dropoff marina |

Without Supabase, booking and join requests still succeed locally (no persistence). `GET /api/yachts` and `GET /api/marinas` still return **seed-real** South Florida inventory so guests can book. Without `XAI_API_KEY`, concierge returns an error until the key is set. Without `STRIPE_SECRET_KEY`, trip checkout returns an error until Stripe is configured.

After a request, the client pays the algorithm fare plus optional captain gratuity with Stripe Checkout. The fare splits **owner 38% / captain 30% / Kaenz 25% / pickup marina 3.5% / dropoff marina 3.5%**. Gratuity is on top and goes only to the captain. If Connect account IDs are set, the webhook at `/api/stripe/webhook` transfers those shares; otherwise the split is recorded and funds stay on the Kaenz platform account.

Guests book from `/fleet/{id}` (bookable yachts) with email + name → `POST /api/checkout/guest` → Stripe Checkout. Success lands on `/book/confirmed`. Owners and captains still list boats from `/join`. There is no demo pay path.

## Supabase

Run `supabase/schema.sql` in the SQL editor, then set the env vars on Vercel.

`yacht_listings` / `marina_listings` are optional (operator-submitted inventory). If those tables are missing, the API serves **seed-real** rows from the origin FL catalog (Galeon, Tempest 42, SAVVY, Pink Lady, Amani at Miami Beach Marina, Island Gardens, Las Olas Marina, Hollywood Marina, Palm Beach Town Docks) and upserts them into `public.yachts` when the service role key is present.

If the Supabase project is paused, unpause it in the dashboard. Minimum env: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Writes need `SUPABASE_SERVICE_ROLE_KEY`.

## Verify guest booking

```bash
curl -s https://kaenz.com/api/yachts
curl -s https://kaenz.com/api/marinas
curl -s -X POST https://kaenz.com/api/checkout/guest \
  -H 'content-type: application/json' \
  -d '{"yachtId":"galeon","kind":"tour","hours":4,"guests":4,"originId":"miami-beach-marina","destinationId":"miami-beach-marina","full_name":"Guest Test","email":"guest@example.com","amount":1}'
```

Click path: `/fleet` → **Bookable now** → a yacht → **Book this trip — pay with Stripe** → name/email/hours/guests → Stripe Checkout. Cancel returns to `/fleet/{id}?checkout=cancel` with a calm message. Success shows `/book/confirmed` (yacht, kind, hours, email, masked session id, **Book another**). Catalog cards stay on `/fleet/{id}` — they never send guests to `/app/yachts`. Owners/captains apply on `/join`. `/app` stays behind login.

Fare is always computed server-side from yacht + kind + hours. Client `amount` / `price` / `total` on `POST /api/checkout/guest` are ignored. Unknown `yachtId` is rejected. Email must be valid. The guest endpoint is rate-limited. Bookings are marked paid only after a verified Stripe webhook (`checkout.session.completed` or `checkout.session.async_payment_succeeded`, and only when `payment_status` is not `unpaid`).

## Product notes

Kaenz is an end-to-end platform, not a charter operator. Independent owners, captains, and marinas run Commute, Tour, and Special Occasion trips.

An algorithm prices each trip from trip type, duration, yacht type, guests, and date.

Fee split: **owner 38% / captain 30% / Kaenz 25% / pickup marina 3.5% / dropoff marina 3.5%**. Optional captain gratuity (15–20%) is on top and goes directly to the captain. Payments: Stripe.
