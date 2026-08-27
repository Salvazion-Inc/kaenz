# Kaenz

Leave the car and travel by yacht. Kaenz is an end-to-end platform — not a charter operator — for Commute, Tour, and Special Occasion trips on yachts worldwide.

This is the **origin platform** rebuilt from [kaenz.com](https://kaenz.com/) (Canva site) as a Next.js app.

## Stack

- **Next.js 15** — site + booking + concierge
- **Canva** — original brand, logo, website copy, and video
- **Grok (xAI)** — trip concierge (`grok-4.6`)
- **Supabase** — bookings and captain/owner applications
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
3. **Request** — commute, tour, or special occasion
4. **Your Trip** — verify request and payment
5. **Crew** — social feed for the water

Add to Home Screen on iOS/Android for the standalone mobile shell.

## Environment

| Variable | Purpose |
| --- | --- |
| `XAI_API_KEY` | Grok concierge (server-only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional server writes |

Without Supabase, booking and join requests still succeed locally (no persistence). Without `XAI_API_KEY`, concierge returns an error until the key is set.

## Supabase

Run `supabase/schema.sql` in the SQL editor, then set the env vars on Vercel.

## Product notes

Kaenz is an end-to-end platform, not a charter operator. Independent owners, captains, and marinas run Commute, Tour, and Special Occasion trips.

An algorithm prices each trip from trip type, duration, yacht type, guests, and date.

Fee split: **owner 38% / captain 30% / Kaenz 25% / pickup marina 3.5% / dropoff marina 3.5%**. Optional captain gratuity (15–20%) is on top and goes directly to the captain. Payments: Stripe.
