-- Kaenz origin platform — run in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text check (role in ('client', 'owner', 'captain', 'both')) default 'client',
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

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

create policy "service insert applications"
  on public.applications for insert
  with check (true);
