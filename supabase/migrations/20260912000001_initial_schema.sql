-- Gym Payment Management MVP
-- Migration 000001: Initial Schema

create extension if not exists pgcrypto;

-- Custom Types / Enums
do $$ begin
  create type public.user_role as enum ('owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'upi', 'online', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'partial', 'paid', 'refunded', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.registration_status as enum ('pending', 'approved', 'rejected', 'converted');
exception when duplicate_object then null; end $$;

-- 1. Gyms
create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  phone text,
  email text,
  address text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Profiles (Owner mapping from auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Membership Plans
create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  duration_days integer not null check (duration_days > 0),
  price numeric(12,2) not null check (price >= 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists membership_plans_gym_idx on public.membership_plans(gym_id, is_active);

-- 4. Members
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_gym_phone_idx on public.members(gym_id, phone);
create index if not exists members_gym_name_idx on public.members(gym_id, full_name);

-- 5. Memberships (Cycles with dues)
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid references public.membership_plans(id) on delete set null,
  plan_name_snapshot text not null,
  amount_due numeric(12,2) not null check (amount_due >= 0),
  start_date date not null,
  due_date date not null,
  end_date date,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memberships_gym_due_idx on public.memberships(gym_id, due_date);
create index if not exists memberships_member_idx on public.memberships(member_id);

-- 6. Payments (Immutable financial records)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method public.payment_method not null,
  status public.payment_status not null default 'paid',
  provider text,
  provider_payment_id text,
  paid_at timestamptz not null default now(),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payments_gym_paid_idx on public.payments(gym_id, paid_at desc);
create index if not exists payments_member_idx on public.payments(member_id, paid_at desc);

-- 7. Registration Requests (from Public QR)
create table if not exists public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  plan_id uuid references public.membership_plans(id) on delete set null,
  plan_name_snapshot text,
  plan_price_snapshot numeric(12,2),
  status public.registration_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registration_requests_gym_idx on public.registration_requests(gym_id, created_at desc);

-- 8. Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_gym_idx on public.audit_logs(gym_id, created_at desc);
