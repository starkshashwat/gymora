-- Gym Payment Management MVP
-- Migration 000002: RLS Policies and Stored Procedures (RPCs)

-- ============================================================================
-- 1. Helper Functions
-- ============================================================================

create or replace function public.current_user_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gym_id from public.profiles where id = auth.uid() limit 1;
$$;

-- ============================================================================
-- 2. Enable RLS on all tables
-- ============================================================================

alter table public.gyms enable row level security;
alter table public.profiles enable row level security;
alter table public.membership_plans enable row level security;
alter table public.members enable row level security;
alter table public.memberships enable row level security;
alter table public.payments enable row level security;
alter table public.registration_requests enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================================
-- 3. RLS Policies
-- ============================================================================

-- Gyms policies
drop policy if exists "Owners can view own gym" on public.gyms;
create policy "Owners can view own gym"
  on public.gyms for select
  to authenticated
  using (id = public.current_user_gym_id());

drop policy if exists "Owners can update own gym" on public.gyms;
create policy "Owners can update own gym"
  on public.gyms for update
  to authenticated
  using (id = public.current_user_gym_id());

-- Profiles policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Membership Plans policies
drop policy if exists "Owners can view plans" on public.membership_plans;
create policy "Owners can view plans"
  on public.membership_plans for select
  to authenticated
  using (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can insert plans" on public.membership_plans;
create policy "Owners can insert plans"
  on public.membership_plans for insert
  to authenticated
  with check (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can update plans" on public.membership_plans;
create policy "Owners can update plans"
  on public.membership_plans for update
  to authenticated
  using (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can delete plans" on public.membership_plans;
create policy "Owners can delete plans"
  on public.membership_plans for delete
  to authenticated
  using (gym_id = public.current_user_gym_id());

-- Members policies
drop policy if exists "Owners can manage members" on public.members;
create policy "Owners can manage members"
  on public.members for all
  to authenticated
  using (gym_id = public.current_user_gym_id())
  with check (gym_id = public.current_user_gym_id());

-- Memberships policies
drop policy if exists "Owners can manage memberships" on public.memberships;
create policy "Owners can manage memberships"
  on public.memberships for all
  to authenticated
  using (gym_id = public.current_user_gym_id())
  with check (gym_id = public.current_user_gym_id());

-- Payments policies
drop policy if exists "Owners can view payments" on public.payments;
create policy "Owners can view payments"
  on public.payments for select
  to authenticated
  using (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can insert payments" on public.payments;
create policy "Owners can insert payments"
  on public.payments for insert
  to authenticated
  with check (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can update payments" on public.payments;
create policy "Owners can update payments"
  on public.payments for update
  to authenticated
  using (gym_id = public.current_user_gym_id());

-- Registration Requests policies
drop policy if exists "Owners can view registration requests" on public.registration_requests;
create policy "Owners can view registration requests"
  on public.registration_requests for select
  to authenticated
  using (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can update registration requests" on public.registration_requests;
create policy "Owners can update registration requests"
  on public.registration_requests for update
  to authenticated
  using (gym_id = public.current_user_gym_id());

-- Audit Logs policies
drop policy if exists "Owners can view audit logs" on public.audit_logs;
create policy "Owners can view audit logs"
  on public.audit_logs for select
  to authenticated
  using (gym_id = public.current_user_gym_id());

drop policy if exists "Owners can insert audit logs" on public.audit_logs;
create policy "Owners can insert audit logs"
  on public.audit_logs for insert
  to authenticated
  with check (gym_id = public.current_user_gym_id());

-- ============================================================================
-- 4. Public Onboarding RPCs (Security Definer)
-- ============================================================================

-- Function: Get safe gym details and active plans for public QR onboarding
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

-- Grant public / anon access to get_public_gym_by_slug
grant execute on function public.get_public_gym_by_slug(text) to anon, authenticated;

-- Function: Create registration request from public QR onboarding
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
  -- Validate gym exists
  select id into v_gym_id
  from public.gyms
  where slug = p_gym_slug;

  if not found then
    raise exception 'Gym not found for slug %', p_gym_slug;
  end if;

  -- Validate active plan belongs to this gym
  select id, name, price into v_plan
  from public.membership_plans
  where id = p_plan_id and gym_id = v_gym_id and is_active = true;

  if not found then
    raise exception 'Active plan not found for this gym';
  end if;

  -- Insert registration request
  insert into public.registration_requests (
    gym_id,
    full_name,
    phone,
    email,
    plan_id,
    plan_name_snapshot,
    plan_price_snapshot,
    status
  ) values (
    v_gym_id,
    trim(p_full_name),
    trim(p_phone),
    nullif(trim(p_email), ''),
    v_plan.id,
    v_plan.name,
    v_plan.price,
    'pending'
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

-- Grant public / anon access to create_registration_request
grant execute on function public.create_registration_request(text, text, text, text, uuid) to anon, authenticated;

-- ============================================================================
-- 5. Business Operations (Atomic Owner RPCs)
-- ============================================================================

-- Function: Atomic Payment Recording
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
  v_member record;
  v_previous_paid numeric(12,2);
  v_new_paid numeric(12,2);
  v_remaining_balance numeric(12,2);
  v_new_status public.payment_status;
  v_payment_id uuid;
begin
  v_owner_gym_id := public.current_user_gym_id();
  if v_owner_gym_id is null then
    raise exception 'Not authorized: no gym associated with current user';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  -- Verify membership belongs to gym
  select * into v_membership
  from public.memberships
  where id = p_membership_id and gym_id = v_owner_gym_id and member_id = p_member_id;

  if not found then
    raise exception 'Membership not found or does not belong to your gym';
  end if;

  -- Calculate existing paid sum
  select coalesce(sum(amount), 0) into v_previous_paid
  from public.payments
  where membership_id = p_membership_id and status = 'paid';

  v_remaining_balance := v_membership.amount_due - v_previous_paid;

  if p_amount > v_remaining_balance then
    raise exception 'Amount ₹% exceeds outstanding balance of ₹%', p_amount, v_remaining_balance;
  end if;

  -- Insert payment record
  insert into public.payments (
    gym_id,
    member_id,
    membership_id,
    amount,
    payment_method,
    status,
    notes,
    created_by
  ) values (
    v_owner_gym_id,
    p_member_id,
    p_membership_id,
    p_amount,
    p_payment_method,
    'paid',
    trim(p_notes),
    auth.uid()
  ) returning id into v_payment_id;

  v_new_paid := v_previous_paid + p_amount;

  if v_new_paid >= v_membership.amount_due then
    v_new_status := 'paid';
  else
    v_new_status := 'partial';
  end if;

  -- Update membership status
  update public.memberships
  set
    status = v_new_status,
    updated_at = now()
  where id = p_membership_id;

  -- Log action in audit_logs
  insert into public.audit_logs (
    gym_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_owner_gym_id,
    auth.uid(),
    'payment_recorded',
    'payment',
    v_payment_id,
    jsonb_build_object(
      'member_id', p_member_id,
      'membership_id', p_membership_id,
      'amount', p_amount,
      'method', p_payment_method,
      'new_membership_status', v_new_status,
      'total_paid', v_new_paid,
      'remaining_balance', (v_membership.amount_due - v_new_paid)
    )
  );

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'membership_id', p_membership_id,
    'amount_recorded', p_amount,
    'total_paid', v_new_paid,
    'remaining_balance', (v_membership.amount_due - v_new_paid),
    'membership_status', v_new_status
  );
end;
$$;

grant execute on function public.record_payment(uuid, uuid, numeric, public.payment_method, text) to authenticated;

-- Function: Convert Registration to Member
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
  v_due_date date;
  v_end_date date;
  v_duration integer;
begin
  v_owner_gym_id := public.current_user_gym_id();
  if v_owner_gym_id is null then
    raise exception 'Not authorized';
  end if;

  -- Validate registration request
  select * into v_reg
  from public.registration_requests
  where id = p_registration_id and gym_id = v_owner_gym_id;

  if not found then
    raise exception 'Registration request not found';
  end if;

  if v_reg.status = 'converted' then
    raise exception 'Registration has already been converted';
  end if;

  -- Check if member with this phone already exists in this gym
  select id into v_member_id
  from public.members
  where gym_id = v_owner_gym_id and phone = v_reg.phone
  limit 1;

  if v_member_id is null then
    insert into public.members (
      gym_id,
      full_name,
      phone,
      email,
      status
    ) values (
      v_owner_gym_id,
      v_reg.full_name,
      v_reg.phone,
      v_reg.email,
      'active'
    ) returning id into v_member_id;
  end if;

  -- Resolve plan
  select * into v_plan
  from public.membership_plans
  where id = v_reg.plan_id;

  v_duration := coalesce(v_plan.duration_days, 30);
  v_start_date := coalesce(p_start_date, current_date);
  v_due_date := v_start_date;
  v_end_date := v_start_date + (v_duration || ' days')::interval;

  -- Create membership
  insert into public.memberships (
    gym_id,
    member_id,
    plan_id,
    plan_name_snapshot,
    amount_due,
    start_date,
    due_date,
    end_date,
    status
  ) values (
    v_owner_gym_id,
    v_member_id,
    v_reg.plan_id,
    coalesce(v_plan.name, v_reg.plan_name_snapshot, 'Membership'),
    coalesce(v_plan.price, v_reg.plan_price_snapshot, 0),
    v_start_date,
    v_due_date,
    v_end_date,
    'pending'
  ) returning id into v_membership_id;

  -- Update registration status
  update public.registration_requests
  set
    status = 'converted',
    updated_at = now()
  where id = p_registration_id;

  -- Log action
  insert into public.audit_logs (
    gym_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_owner_gym_id,
    auth.uid(),
    'registration_converted',
    'registration_request',
    p_registration_id,
    jsonb_build_object(
      'member_id', v_member_id,
      'membership_id', v_membership_id,
      'phone', v_reg.phone
    )
  );

  return jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'membership_id', v_membership_id,
    'registration_id', p_registration_id
  );
end;
$$;

grant execute on function public.convert_registration_to_member(uuid, date) to authenticated;
