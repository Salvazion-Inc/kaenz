-- Kaenz origin platform — run in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  credit_last4 text,
  credit_expiry text,
  credit_brand text,
  debit_last4 text,
  debit_expiry text,
  debit_brand text,
  solana_wallet text,
  instagram text,
  city text,
  city_lat double precision,
  city_lng double precision,
  role text check (role in ('client', 'customer', 'owner', 'captain', 'both')) default 'client',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists credit_last4 text;
alter table public.profiles add column if not exists credit_expiry text;
alter table public.profiles add column if not exists credit_brand text;
alter table public.profiles add column if not exists debit_last4 text;
alter table public.profiles add column if not exists debit_expiry text;
alter table public.profiles add column if not exists debit_brand text;
alter table public.profiles add column if not exists solana_wallet text;
alter table public.profiles add column if not exists instagram text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists city_lat double precision;
alter table public.profiles add column if not exists city_lng double precision;

alter table public.bookings add column if not exists user_id text;
alter table public.bookings add column if not exists trip_kind text;
alter table public.bookings add column if not exists fare_amount numeric;
alter table public.bookings add column if not exists gratuity_pct numeric;
alter table public.bookings add column if not exists gratuity_amount numeric;
alter table public.bookings add column if not exists share_owner numeric;
alter table public.bookings add column if not exists share_captain numeric;
alter table public.bookings add column if not exists share_platform numeric;
alter table public.bookings add column if not exists share_marina_pickup numeric;
alter table public.bookings add column if not exists share_marina_dropoff numeric;
alter table public.bookings add column if not exists stripe_session_id text;
alter table public.bookings add column if not exists stripe_payment_intent text;
alter table public.bookings add column if not exists transfer_group text;
alter table public.bookings add column if not exists payouts jsonb;

create table if not exists public.yachts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  class text,
  length_ft int,
  guests int,
  hours_min int,
  price_from numeric,
  marina text,
  image_url text,
  owner_id uuid references public.profiles(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  yacht_slug text,
  full_name text not null,
  email text not null,
  phone text,
  origin text,
  destination text,
  trip_date date,
  trip_time text,
  guests int,
  notes text,
  status text not null default 'requested',
  locale text default 'en',
  amount numeric,
  payment_method text,
  trip_kind text,
  fare_amount numeric,
  gratuity_pct numeric,
  gratuity_amount numeric,
  share_owner numeric,
  share_captain numeric,
  share_platform numeric,
  share_marina_pickup numeric,
  share_marina_dropoff numeric,
  stripe_session_id text,
  stripe_payment_intent text,
  transfer_group text,
  payouts jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_posts (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  body text not null,
  place text,
  locale text default 'en',
  created_at timestamptz not null default now()
);

alter table public.crew_posts enable row level security;

create policy "public read crew posts"
  on public.crew_posts for select
  using (true);

create policy "public insert crew posts"
  on public.crew_posts for insert
  with check (true);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  role text not null,
  yacht_name text,
  uscg_license text,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;
alter table public.applications enable row level security;
alter table public.yachts enable row level security;
alter table public.profiles enable row level security;

create policy "public read active yachts"
  on public.yachts for select
  using (active = true);

create policy "service insert bookings"
  on public.bookings for insert
  with check (true);

create policy "service update bookings"
  on public.bookings for update
  using (true)
  with check (true);

create policy "service insert applications"
  on public.applications for insert
  with check (true);

create table if not exists public.yacht_listings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  created_by text,
  status text not null default 'listed',
  owner_name text not null,
  owner_id_url text,
  owner_wallet text not null,
  name text not null,
  hin text not null,
  guests int not null,
  traits text[] not null default '{}',
  home_port text not null,
  photo_urls text[] not null default '{}',
  captain_name text not null,
  captain_id_url text,
  captain_mmc_url text,
  captain_photo_url text,
  captain_languages text[] not null default '{}',
  captain_region text not null,
  captain_wallet text not null,
  created_at timestamptz not null default now()
);

alter table public.yacht_listings enable row level security;

create policy "public read listed yachts"
  on public.yacht_listings for select
  using (status = 'listed');

create table if not exists public.marina_listings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  created_by text,
  status text not null default 'listed',
  kind text not null default 'marina',
  name text not null,
  lat double precision not null,
  lng double precision not null,
  address text not null,
  region text not null,
  dockmaster text not null,
  phone text not null,
  website text not null,
  wallet text not null,
  created_at timestamptz not null default now()
);

alter table public.marina_listings enable row level security;

create policy "public read listed marinas"
  on public.marina_listings for select
  using (status = 'listed');
