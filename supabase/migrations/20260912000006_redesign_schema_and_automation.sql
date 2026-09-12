-- Gym Payment Management MVP
-- Migration 000006: Redesign Schema, Membership Lifecycle, Plan Images, WhatsApp Opt-in, Settings & Automation

-- 1. Extend membership_plans
alter table public.membership_plans
  add column if not exists image_url text,
  add column if not exists features text[] default '{}';

-- 2. Extend members
alter table public.members
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists whatsapp_opted_in_at timestamptz,
  add column if not exists whatsapp_opt_out boolean not null default false,
  add column if not exists whatsapp_opted_out_at timestamptz;

-- 3. Extend memberships (Decouple Lifecycle from Payment Status)
alter table public.memberships
  add column if not exists lifecycle text not null default 'active'
    check (lifecycle in ('active', 'paused', 'cancelled', 'expired')),
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists paused_at timestamptz;

-- 4. Extend gyms
alter table public.gyms
  add column if not exists auto_cancel_overdue_days integer default null,
  add column if not exists payment_instructions text,
  add column if not exists online_gateway_settings jsonb default '{}'::jsonb,
  add column if not exists whatsapp_business_settings jsonb default '{}'::jsonb;

-- 5. Create Automation Rules Table
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

-- 6. Create Automation Logs Table
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

-- 7. Enable RLS on automation tables
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

-- 8. Atomic Registration Approval & Member Creation RPC
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

  -- Resolve plan
  if v_reg.plan_id is not null then
    select * into v_plan from public.membership_plans where id = v_reg.plan_id and gym_id = v_owner_gym_id;
  end if;

  v_duration := coalesce(v_plan.duration_days, 30);
  v_plan_price := coalesce(v_reg.plan_price_snapshot, v_plan.price, 0);
  v_start := current_date;
  v_end := v_start + (v_duration || ' days')::interval;
  v_due_date := v_start;

  -- Create Member
  insert into public.members (
    gym_id,
    full_name,
    phone,
    email,
    status,
    joined_at
  ) values (
    v_owner_gym_id,
    v_reg.full_name,
    v_reg.phone,
    v_reg.email,
    'active',
    v_start
  ) returning id into v_member_id;

  -- Calculate payment status
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

  -- Create Membership
  insert into public.memberships (
    gym_id,
    member_id,
    plan_id,
    plan_name_snapshot,
    amount_due,
    start_date,
    due_date,
    end_date,
    status,
    lifecycle
  ) values (
    v_owner_gym_id,
    v_member_id,
    v_reg.plan_id,
    coalesce(v_reg.plan_name_snapshot, v_plan.name, 'Standard Plan'),
    v_plan_price,
    v_start,
    v_due_date,
    v_end,
    v_payment_status,
    'active'
  ) returning id into v_membership_id;

  -- If payment received, record payment record
  if p_payment_received and p_amount_received > 0 then
    insert into public.payments (
      gym_id,
      member_id,
      membership_id,
      amount,
      payment_method,
      status,
      paid_at,
      notes,
      created_by
    ) values (
      v_owner_gym_id,
      v_member_id,
      v_membership_id,
      p_amount_received,
      p_payment_method::public.payment_method,
      'paid',
      now(),
      coalesce(p_notes, 'Payment received upon QR registration approval'),
      auth.uid()
    ) returning id into v_payment_id;
  end if;

  -- Mark Registration as converted
  update public.registration_requests
  set status = 'converted',
      updated_at = now()
  where id = p_registration_id;

  -- Record Audit Log
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
    'approve_registration',
    'member',
    v_member_id,
    jsonb_build_object(
      'registration_id', p_registration_id,
      'payment_received', p_payment_received,
      'amount_received', p_amount_received,
      'remaining_balance', v_remaining_balance
    )
  );

  return jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'membership_id', v_membership_id,
    'payment_id', v_payment_id,
    'full_name', v_reg.full_name,
    'payment_status', v_payment_status,
    'remaining_balance', v_remaining_balance
  );
end;
$$;

grant execute on function public.approve_registration_and_create_member(uuid, boolean, numeric, text, text) to authenticated;

-- 9. Membership Cancellation RPC (Preserves History & Financial Records)
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
  if v_owner_gym_id is null then
    raise exception 'Not authorized: no gym associated with current user';
  end if;

  select * into v_mship
  from public.memberships
  where id = p_membership_id and gym_id = v_owner_gym_id
  for update;

  if not found then
    raise exception 'Membership not found';
  end if;

  -- Update membership lifecycle to cancelled
  update public.memberships
  set lifecycle = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = p_reason,
      updated_at = now()
  where id = p_membership_id;

  -- Check if member has other active memberships
  select count(*) into v_active_count
  from public.memberships
  where member_id = v_mship.member_id and lifecycle = 'active' and id != p_membership_id;

  if v_active_count = 0 then
    update public.members
    set status = 'inactive',
        updated_at = now()
    where id = v_mship.member_id;
  end if;

  -- Audit Log
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
    'cancel_membership',
    'membership',
    p_membership_id,
    jsonb_build_object(
      'member_id', v_mship.member_id,
      'reason', p_reason
    )
  );

  return jsonb_build_object(
    'success', true,
    'membership_id', p_membership_id,
    'lifecycle', 'cancelled'
  );
end;
$$;

grant execute on function public.cancel_membership(uuid, text) to authenticated;

-- 10. Pause / Reactivate Membership RPCs
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
  if v_owner_gym_id is null then
    raise exception 'Not authorized';
  end if;

  update public.memberships
  set lifecycle = 'paused',
      paused_at = now(),
      updated_at = now()
  where id = p_membership_id and gym_id = v_owner_gym_id;

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
  if v_owner_gym_id is null then
    raise exception 'Not authorized';
  end if;

  select * into v_mship
  from public.memberships
  where id = p_membership_id and gym_id = v_owner_gym_id;

  update public.memberships
  set lifecycle = 'active',
      paused_at = null,
      cancelled_at = null,
      updated_at = now()
  where id = p_membership_id and gym_id = v_owner_gym_id;

  update public.members
  set status = 'active',
      updated_at = now()
  where id = v_mship.member_id and gym_id = v_owner_gym_id;

  return jsonb_build_object('success', true, 'membership_id', p_membership_id, 'lifecycle', 'active');
end;
$$;

grant execute on function public.pause_membership(uuid) to authenticated;
grant execute on function public.reactivate_membership(uuid) to authenticated;
