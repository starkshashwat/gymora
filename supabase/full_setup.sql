-- ============================================================================
-- GYM PAYMENT MANAGEMENT MVP — COMPLETE SUPABASE DATABASE SETUP
-- Run this entire script in Supabase Dashboard -> SQL Editor -> Click "Run"
-- ============================================================================

-- 1. Extensions & Types
create extension if not exists pgcrypto;

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

-- 2. Tables & Indexes
create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  phone text,
  email text,
  address text,
  logo_url text,
  payment_mode text not null default 'local_qr',
  upi_id text,
  upi_qr_url text,
  gateway_provider text,
  gateway_key_id text,
  gateway_key_secret text,
  whatsapp_mode text not null default 'local_click_to_chat',
  fb_waba_id text,
  fb_phone_number_id text,
  fb_access_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- 3. Row Level Security & Helpers
create or replace function public.current_user_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gym_id from public.profiles where id = auth.uid() limit 1;
$$;

alter table public.gyms enable row level security;
alter table public.profiles enable row level security;
alter table public.membership_plans enable row level security;
alter table public.members enable row level security;
alter table public.memberships enable row level security;
alter table public.payments enable row level security;
alter table public.registration_requests enable row level security;
alter table public.audit_logs enable row level security;

-- Policies
drop policy if exists "Owners can view own gym" on public.gyms;
create policy "Owners can view own gym" on public.gyms for select to authenticated using (id = public.current_user_gym_id());

drop policy if exists "Owners can update own gym" on public.gyms;
create policy "Owners can update own gym" on public.gyms for update to authenticated using (id = public.current_user_gym_id());

drop policy if exists "Owners can insert gym" on public.gyms;
create policy "Owners can insert gym" on public.gyms for insert to authenticated with check (true);

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists "Owners can manage plans" on public.membership_plans;
create policy "Owners can manage plans" on public.membership_plans for all to authenticated
using (gym_id = public.current_user_gym_id()) with check (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can manage members" on public.members;
create policy "Owners can manage members" on public.members for all to authenticated
using (gym_id = public.current_user_gym_id()) with check (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can manage memberships" on public.memberships;
create policy "Owners can manage memberships" on public.memberships for all to authenticated
using (gym_id = public.current_user_gym_id()) with check (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can manage payments" on public.payments;
create policy "Owners can manage payments" on public.payments for all to authenticated
using (gym_id = public.current_user_gym_id()) with check (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can manage registration requests" on public.registration_requests;
create policy "Owners can manage registration requests" on public.registration_requests for all to authenticated
using (gym_id = public.current_user_gym_id()) with check (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can manage audit logs" on public.audit_logs;
create policy "Owners can manage audit logs" on public.audit_logs for all to authenticated
using (gym_id = public.current_user_gym_id()) with check (gym_id = public.current_user_gym_id());

-- 4. Public Onboarding RPCs
create or replace function public.get_public_gym_by_slug(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym record;
  v_plans jsonb;
begin
  select id, name, slug, phone, email, address, logo_url
  into v_gym
  from public.gyms
  where slug = p_slug;

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'duration_days', duration_days,
      'price', price,
      'description', description
    ) order by price asc
  ), '[]'::jsonb)
  into v_plans
  from public.membership_plans
  where gym_id = v_gym.id and is_active = true;

  return jsonb_build_object(
    'gym', jsonb_build_object(
      'name', v_gym.name,
      'slug', v_gym.slug,
      'phone', v_gym.phone,
      'email', v_gym.email,
      'address', v_gym.address,
      'logo_url', v_gym.logo_url
    ),
    'plans', v_plans
  );
end;
$$;

grant execute on function public.get_public_gym_by_slug(text) to anon, authenticated;

create or replace function public.create_registration_request(
  p_gym_slug text,
  p_full_name text,
  p_phone text,
  p_email text,
  p_plan_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid;
  v_plan record;
  v_registration_id uuid;
begin
  select id into v_gym_id from public.gyms where slug = p_gym_slug;
  if not found then raise exception 'Gym not found'; end if;

  select id, name, price into v_plan
  from public.membership_plans
  where id = p_plan_id and gym_id = v_gym_id and is_active = true;
  if not found then raise exception 'Active plan not found'; end if;

  insert into public.registration_requests (
    gym_id, full_name, phone, email, plan_id, plan_name_snapshot, plan_price_snapshot, status
  ) values (
    v_gym_id, trim(p_full_name), trim(p_phone), nullif(trim(p_email), ''), v_plan.id, v_plan.name, v_plan.price, 'pending'
  ) returning id into v_registration_id;

  return jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'gym_name', (select name from public.gyms where id = v_gym_id),
    'plan_name', v_plan.name,
    'price', v_plan.price,
    'status', 'pending'
  );
end;
$$;

grant execute on function public.create_registration_request(text, text, text, text, uuid) to anon, authenticated;

-- 5. Business Operations (Atomic Payment & Conversion)
create or replace function public.record_payment(
  p_member_id uuid,
  p_membership_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_gym_id uuid;
  v_membership record;
  v_previous_paid numeric(12,2);
  v_new_paid numeric(12,2);
  v_remaining_balance numeric(12,2);
  v_new_status public.payment_status;
  v_payment_id uuid;
begin
  v_owner_gym_id := public.current_user_gym_id();
  if v_owner_gym_id is null then raise exception 'Not authorized'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;

  select * into v_membership
  from public.memberships
  where id = p_membership_id and gym_id = v_owner_gym_id and member_id = p_member_id;
  if not found then raise exception 'Membership not found'; end if;

  select coalesce(sum(amount), 0) into v_previous_paid
  from public.payments where membership_id = p_membership_id and status = 'paid';

  v_remaining_balance := v_membership.amount_due - v_previous_paid;
  if p_amount > v_remaining_balance then
    raise exception 'Amount exceeds outstanding balance';
  end if;

  insert into public.payments (
    gym_id, member_id, membership_id, amount, payment_method, status, notes, created_by
  ) values (
    v_owner_gym_id, p_member_id, p_membership_id, p_amount, p_payment_method, 'paid', trim(p_notes), auth.uid()
  ) returning id into v_payment_id;

  v_new_paid := v_previous_paid + p_amount;
  if v_new_paid >= v_membership.amount_due then
    v_new_status := 'paid';
  else
    v_new_status := 'partial';
  end if;

  update public.memberships set status = v_new_status, updated_at = now() where id = p_membership_id;

  insert into public.audit_logs (gym_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_owner_gym_id, auth.uid(), 'payment_recorded', 'payment', v_payment_id,
    jsonb_build_object('amount', p_amount, 'method', p_payment_method, 'new_status', v_new_status)
  );

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'total_paid', v_new_paid,
    'remaining_balance', (v_membership.amount_due - v_new_paid),
    'membership_status', v_new_status
  );
end;
$$;

grant execute on function public.record_payment(uuid, uuid, numeric, public.payment_method, text) to authenticated;

create or replace function public.convert_registration_to_member(
  p_registration_id uuid,
  p_start_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_gym_id uuid;
  v_reg record;
  v_plan record;
  v_member_id uuid;
  v_membership_id uuid;
  v_start_date date;
begin
  v_owner_gym_id := public.current_user_gym_id();
  if v_owner_gym_id is null then raise exception 'Not authorized'; end if;

  select * into v_reg from public.registration_requests where id = p_registration_id and gym_id = v_owner_gym_id;
  if not found then raise exception 'Registration not found'; end if;
  if v_reg.status = 'converted' then raise exception 'Already converted'; end if;

  select id into v_member_id from public.members where gym_id = v_owner_gym_id and phone = v_reg.phone limit 1;
  if v_member_id is null then
    insert into public.members (gym_id, full_name, phone, email, status)
    values (v_owner_gym_id, v_reg.full_name, v_reg.phone, v_reg.email, 'active')
    returning id into v_member_id;
  end if;

  select * into v_plan from public.membership_plans where id = v_reg.plan_id;
  v_start_date := coalesce(p_start_date, current_date);

  insert into public.memberships (
    gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status
  ) values (
    v_owner_gym_id, v_member_id, v_reg.plan_id,
    coalesce(v_plan.name, v_reg.plan_name_snapshot, 'Membership'),
    coalesce(v_plan.price, v_reg.plan_price_snapshot, 0),
    v_start_date, v_start_date, v_start_date + (coalesce(v_plan.duration_days, 30) || ' days')::interval,
    'pending'
  ) returning id into v_membership_id;

  update public.registration_requests set status = 'converted', updated_at = now() where id = p_registration_id;

  insert into public.audit_logs (gym_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_owner_gym_id, auth.uid(), 'registration_converted', 'registration_request', p_registration_id, null);

  return jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'membership_id', v_membership_id
  );
end;
$$;

grant execute on function public.convert_registration_to_member(uuid, date) to authenticated;

-- Function: Atomic Delete Member
create or replace function public.delete_member(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_gym_id uuid;
  v_deleted_count integer;
begin
  v_owner_gym_id := public.current_user_gym_id();
  if v_owner_gym_id is null then
    raise exception 'Not authorized';
  end if;

  delete from public.members
  where id = p_member_id and gym_id = v_owner_gym_id;

  get diagnostics v_deleted_count = row_count;
  if v_deleted_count = 0 then
    raise exception 'Member not found or not authorized';
  end if;

  return jsonb_build_object('success', true, 'deleted_member_id', p_member_id);
end;
$$;

grant execute on function public.delete_member(uuid) to authenticated;

-- Function: Atomic Add Member with Membership Cycle
create or replace function public.add_gym_member(
  p_full_name text,
  p_phone text,
  p_email text,
  p_plan_id uuid,
  p_start_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_gym_id uuid;
  v_plan record;
  v_member_id uuid;
  v_membership_id uuid;
  v_start date;
  v_end date;
begin
  v_owner_gym_id := public.current_user_gym_id();
  if v_owner_gym_id is null then
    raise exception 'Not authorized';
  end if;

  if trim(p_full_name) = '' or trim(p_phone) = '' then
    raise exception 'Full name and phone are required';
  end if;

  select * into v_plan
  from public.membership_plans
  where id = p_plan_id and gym_id = v_owner_gym_id;

  if not found then
    raise exception 'Selected plan does not exist in your gym';
  end if;

  v_start := coalesce(p_start_date, current_date);
  v_end := v_start + (v_plan.duration_days || ' days')::interval;

  insert into public.members (gym_id, full_name, phone, email, status, joined_at)
  values (v_owner_gym_id, trim(p_full_name), trim(p_phone), nullif(trim(p_email), ''), 'active', v_start)
  returning id into v_member_id;

  insert into public.memberships (
    gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status
  ) values (
    v_owner_gym_id, v_member_id, v_plan.id, v_plan.name, v_plan.price, v_start, v_start, v_end, 'pending'
  ) returning id into v_membership_id;

  return jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'membership_id', v_membership_id,
    'full_name', trim(p_full_name),
    'plan_name', v_plan.name,
    'amount_due', v_plan.price
  );
end;
$$;

grant execute on function public.add_gym_member(text, text, text, uuid, date) to authenticated;

-- 6. Initial Seed Data
do $$
declare
  v_gym_id uuid;
  v_plan_monthly_id uuid;
  v_plan_quarterly_id uuid;
  v_plan_annual_id uuid;
  v_member_due_id uuid;
  v_member_overdue_id uuid;
  v_member_partial_id uuid;
  v_member_paid_id uuid;
  v_membership_due_id uuid;
  v_membership_overdue_id uuid;
  v_membership_partial_id uuid;
  v_membership_paid_id uuid;
begin
  select id into v_gym_id from public.gyms where slug = 'gymora';

  if v_gym_id is null then
    insert into public.gyms (name, slug, phone, email, address, logo_url)
    values (
      'Gymora', 'gymora', '+91 98765 43210', 'contact@gymora.fit',
      '42 Fitness Boulevard, Bandra West, Mumbai',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&auto=format&fit=crop&q=80'
    ) returning id into v_gym_id;
  end if;

  if not exists (select 1 from public.membership_plans where gym_id = v_gym_id) then
    insert into public.membership_plans (gym_id, name, duration_days, price, description, is_active)
    values (v_gym_id, 'Monthly Standard', 30, 1500.00, 'Full gym access with locker facilities', true)
    returning id into v_plan_monthly_id;

    insert into public.membership_plans (gym_id, name, duration_days, price, description, is_active)
    values (v_gym_id, 'Quarterly Pro', 90, 4000.00, 'Full gym access + 1 free trainer consultation', true)
    returning id into v_plan_quarterly_id;

    insert into public.membership_plans (gym_id, name, duration_days, price, description, is_active)
    values (v_gym_id, 'Annual Elite', 365, 14000.00, 'Unlimited all-hours access + sauna & nutrition guide', true)
    returning id into v_plan_annual_id;

    -- Members & Memberships
    insert into public.members (gym_id, full_name, phone, email, status)
    values (v_gym_id, 'Aarav Sharma', '+919876543210', 'aarav.sharma@example.com', 'active')
    returning id into v_member_due_id;

    insert into public.memberships (gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status)
    values (v_gym_id, v_member_due_id, v_plan_monthly_id, 'Monthly Standard', 1500.00, current_date, current_date, current_date + 30, 'pending');

    insert into public.members (gym_id, full_name, phone, email, status)
    values (v_gym_id, 'Priya Patel', '+919812345678', 'priya.patel@example.com', 'active')
    returning id into v_member_overdue_id;

    insert into public.memberships (gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status)
    values (v_gym_id, v_member_overdue_id, v_plan_quarterly_id, 'Quarterly Pro', 4000.00, current_date - 95, current_date - 5, current_date - 5, 'pending');

    insert into public.members (gym_id, full_name, phone, email, status)
    values (v_gym_id, 'Rahul Verma', '+919765432109', 'rahul.verma@example.com', 'active')
    returning id into v_member_partial_id;

    insert into public.memberships (gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status)
    values (v_gym_id, v_member_partial_id, v_plan_monthly_id, 'Monthly Standard', 1500.00, current_date - 10, current_date + 20, current_date + 20, 'partial')
    returning id into v_membership_partial_id;

    insert into public.payments (gym_id, member_id, membership_id, amount, payment_method, status, notes)
    values (v_gym_id, v_member_partial_id, v_membership_partial_id, 500.00, 'upi', 'paid', 'Advance installment via UPI');

    insert into public.members (gym_id, full_name, phone, email, status)
    values (v_gym_id, 'Ananya Iyer', '+919988776655', 'ananya.iyer@example.com', 'active')
    returning id into v_member_paid_id;

    insert into public.memberships (gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status)
    values (v_gym_id, v_member_paid_id, v_plan_monthly_id, 'Monthly Standard', 1500.00, current_date - 20, current_date + 10, current_date + 10, 'paid')
    returning id into v_membership_paid_id;

    insert into public.payments (gym_id, member_id, membership_id, amount, payment_method, status, notes)
    values (v_gym_id, v_member_paid_id, v_membership_paid_id, 1500.00, 'cash', 'paid', 'Full payment cash at reception');

    insert into public.registration_requests (gym_id, full_name, phone, email, plan_id, plan_name_snapshot, plan_price_snapshot, status)
    values (v_gym_id, 'Rohan Mehta', '+919823456789', 'rohan.mehta@example.com', v_plan_monthly_id, 'Monthly Standard', 1500.00, 'pending');
  end if;
end $$;

-- Migration 000006 Extensions:
alter table public.membership_plans
  add column if not exists image_url text,
  add column if not exists features text[] default '{}';

alter table public.members
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists whatsapp_opted_in_at timestamptz,
  add column if not exists whatsapp_opt_out boolean not null default false,
  add column if not exists whatsapp_opted_out_at timestamptz;

alter table public.memberships
  add column if not exists lifecycle text not null default 'active'
    check (lifecycle in ('active', 'paused', 'cancelled', 'expired')),
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists paused_at timestamptz;

alter table public.gyms
  add column if not exists auto_cancel_overdue_days integer default null,
  add column if not exists payment_instructions text,
  add column if not exists online_gateway_settings jsonb default '{}'::jsonb,
  add column if not exists whatsapp_business_settings jsonb default '{}'::jsonb;

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  event_type text not null,
  timing_offset_days integer not null default 0,
  is_enabled boolean not null default true,
  channel text not null default 'whatsapp',
  template_name text not null,
  template_variables jsonb default '[]'::jsonb,
  stop_conditions jsonb default '{"on_payment": true}'::jsonb,
  max_sends integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists automation_rules_gym_idx on public.automation_rules(gym_id, event_type);

create table if not exists public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  rule_id uuid references public.automation_rules(id) on delete set null,
  event_type text not null,
  status text not null default 'pending',
  payload jsonb,
  error_message text,
  sent_at timestamptz default now()
);

create index if not exists automation_logs_gym_idx on public.automation_logs(gym_id, sent_at desc);

alter table public.automation_rules enable row level security;
alter table public.automation_logs enable row level security;

drop policy if exists "Owners manage automation rules" on public.automation_rules;
create policy "Owners manage automation rules"
  on public.automation_rules for all
  to authenticated
  using (gym_id = public.current_user_gym_id())
  with check (gym_id = public.current_user_gym_id());

drop policy if exists "Owners read automation logs" on public.automation_logs;
create policy "Owners read automation logs"
  on public.automation_logs for select
  to authenticated
  using (gym_id = public.current_user_gym_id());

create or replace function public.approve_registration_and_create_member(
  p_registration_id uuid,
  p_payment_received boolean default false,
  p_amount_received numeric default 0,
  p_payment_method text default 'cash',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_gym_id uuid;
  v_reg record;
  v_member_id uuid;
  v_membership_id uuid;
  v_payment_id uuid;
  v_plan record;
  v_start date;
  v_end date;
  v_due_date date;
  v_duration integer;
  v_plan_price numeric;
  v_remaining_balance numeric;
  v_payment_status public.payment_status;
begin
  v_owner_gym_id := public.current_user_gym_id();
  if v_owner_gym_id is null then
    raise exception 'Not authorized: no gym associated with current user';
  end if;

  select * into v_reg
  from public.registration_requests
  where id = p_registration_id and gym_id = v_owner_gym_id
  for update;

  if not found then
    raise exception 'Registration request not found';
  end if;

  if v_reg.status = 'converted' then
    raise exception 'Registration request has already been approved and converted';
  end if;

  if v_reg.plan_id is not null then
    select * into v_plan from public.membership_plans where id = v_reg.plan_id and gym_id = v_owner_gym_id;
  end if;

  v_duration := coalesce(v_plan.duration_days, 30);
  v_plan_price := coalesce(v_reg.plan_price_snapshot, v_plan.price, 0);
  v_start := current_date;
  v_end := v_start + (v_duration || ' days')::interval;
  v_due_date := v_start;

  insert into public.members (
    gym_id, full_name, phone, email, status, joined_at
  ) values (
    v_owner_gym_id, v_reg.full_name, v_reg.phone, v_reg.email, 'active', v_start
  ) returning id into v_member_id;

  if p_payment_received and p_amount_received > 0 then
    if p_amount_received >= v_plan_price then
      v_payment_status := 'paid';
      v_remaining_balance := 0;
    else
      v_payment_status := 'partial';
      v_remaining_balance := v_plan_price - p_amount_received;
    end if;
  else
    v_payment_status := 'pending';
    v_remaining_balance := v_plan_price;
  end if;

  insert into public.memberships (
    gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status, lifecycle
  ) values (
    v_owner_gym_id, v_member_id, v_reg.plan_id, coalesce(v_reg.plan_name_snapshot, v_plan.name, 'Standard Plan'),
    v_plan_price, v_start, v_due_date, v_end, v_payment_status, 'active'
  ) returning id into v_membership_id;

  if p_payment_received and p_amount_received > 0 then
    insert into public.payments (
      gym_id, member_id, membership_id, amount, payment_method, status, paid_at, notes, created_by
    ) values (
      v_owner_gym_id, v_member_id, v_membership_id, p_amount_received, p_payment_method::public.payment_method,
      'paid', now(), coalesce(p_notes, 'Payment received upon QR registration approval'), auth.uid()
    ) returning id into v_payment_id;
  end if;

  update public.registration_requests
  set status = 'converted', updated_at = now()
  where id = p_registration_id;

  insert into public.audit_logs (
    gym_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    v_owner_gym_id, auth.uid(), 'approve_registration', 'member', v_member_id,
    jsonb_build_object('registration_id', p_registration_id, 'payment_received', p_payment_received, 'amount_received', p_amount_received, 'remaining_balance', v_remaining_balance)
  );

  return jsonb_build_object(
    'success', true, 'member_id', v_member_id, 'membership_id', v_membership_id, 'payment_id', v_payment_id,
    'full_name', v_reg.full_name, 'payment_status', v_payment_status, 'remaining_balance', v_remaining_balance
  );
end;
$$;

grant execute on function public.approve_registration_and_create_member(uuid, boolean, numeric, text, text) to authenticated;

create or replace function public.cancel_membership(
  p_membership_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_gym_id uuid;
  v_mship record;
  v_active_count integer;
begin
  v_owner_gym_id := public.current_user_gym_id();
  if v_owner_gym_id is null then raise exception 'Not authorized'; end if;

  select * into v_mship from public.memberships where id = p_membership_id and gym_id = v_owner_gym_id for update;
  if not found then raise exception 'Membership not found'; end if;

  update public.memberships
  set lifecycle = 'cancelled', cancelled_at = now(), cancellation_reason = p_reason, updated_at = now()
  where id = p_membership_id;

  select count(*) into v_active_count from public.memberships where member_id = v_mship.member_id and lifecycle = 'active' and id != p_membership_id;
  if v_active_count = 0 then
    update public.members set status = 'inactive', updated_at = now() where id = v_mship.member_id;
  end if;

  insert into public.audit_logs (
    gym_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    v_owner_gym_id, auth.uid(), 'cancel_membership', 'membership', p_membership_id, jsonb_build_object('member_id', v_mship.member_id, 'reason', p_reason)
  );

  return jsonb_build_object('success', true, 'membership_id', p_membership_id, 'lifecycle', 'cancelled');
end;
$$;

grant execute on function public.cancel_membership(uuid, text) to authenticated;

create or replace function public.pause_membership(p_membership_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_gym_id uuid;
begin
  v_owner_gym_id := public.current_user_gym_id();
  if v_owner_gym_id is null then raise exception 'Not authorized'; end if;
  update public.memberships set lifecycle = 'paused', paused_at = now(), updated_at = now() where id = p_membership_id and gym_id = v_owner_gym_id;
  return jsonb_build_object('success', true, 'membership_id', p_membership_id, 'lifecycle', 'paused');
end;
$$;

create or replace function public.reactivate_membership(p_membership_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_gym_id uuid;
  v_mship record;
begin
  v_owner_gym_id := public.current_user_gym_id();
  if v_owner_gym_id is null then raise exception 'Not authorized'; end if;
  select * into v_mship from public.memberships where id = p_membership_id and gym_id = v_owner_gym_id;
  update public.memberships set lifecycle = 'active', paused_at = null, cancelled_at = null, updated_at = now() where id = p_membership_id and gym_id = v_owner_gym_id;
  update public.members set status = 'active', updated_at = now() where id = v_mship.member_id and gym_id = v_owner_gym_id;
  return jsonb_build_object('success', true, 'membership_id', p_membership_id, 'lifecycle', 'active');
end;
$$;

grant execute on function public.pause_membership(uuid) to authenticated;
grant execute on function public.reactivate_membership(uuid) to authenticated;

