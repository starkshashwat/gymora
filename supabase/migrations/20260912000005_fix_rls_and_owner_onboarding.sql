-- Gym Payment Management MVP
-- Migration 000005: Fix RLS for Owner Onboarding, Member Deletion & Direct DB Persistence

-- 1. Ensure authenticated users can insert into gyms
drop policy if exists "Owners can insert gym" on public.gyms;
create policy "Owners can insert gym"
  on public.gyms for insert
  to authenticated
  with check (true);

-- 2. Ensure authenticated users can insert their own profile
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- 3. Atomic delete member RPC (Security Definer)
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
    raise exception 'Not authorized: no gym associated with current user';
  end if;

  -- Verify and delete member (cascades to memberships and payments via foreign keys)
  delete from public.members
  where id = p_member_id and gym_id = v_owner_gym_id;

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count = 0 then
    raise exception 'Member not found or not authorized to delete';
  end if;

  return jsonb_build_object(
    'success', true,
    'deleted_member_id', p_member_id
  );
end;
$$;

grant execute on function public.delete_member(uuid) to authenticated;

-- 4. Atomic add member with membership cycle RPC (Security Definer)
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
    raise exception 'Not authorized: no gym associated with current user';
  end if;

  if trim(p_full_name) = '' or trim(p_phone) = '' then
    raise exception 'Full name and phone are required';
  end if;

  select * into v_plan
  from public.membership_plans
  where id = p_plan_id and gym_id = v_owner_gym_id;

  if not found then
    raise exception 'Selected membership plan does not exist in your gym';
  end if;

  v_start := coalesce(p_start_date, current_date);
  v_end := v_start + (v_plan.duration_days || ' days')::interval;

  -- Insert member
  insert into public.members (
    gym_id,
    full_name,
    phone,
    email,
    status,
    joined_at
  ) values (
    v_owner_gym_id,
    trim(p_full_name),
    trim(p_phone),
    nullif(trim(p_email), ''),
    'active',
    v_start
  ) returning id into v_member_id;

  -- Insert membership cycle
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
    v_plan.id,
    v_plan.name,
    v_plan.price,
    v_start,
    v_start,
    v_end,
    'pending'
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
