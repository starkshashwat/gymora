-- Gym Payment Management MVP
-- Migration 000003: Seed Demo Data

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
  -- 1. Create or get Demo Gym
  select id into v_gym_id from public.gyms where slug = 'iron-pulse';

  if v_gym_id is null then
    insert into public.gyms (
      name,
      slug,
      phone,
      email,
      address,
      logo_url
    ) values (
      'Iron Pulse Fitness',
      'iron-pulse',
      '+91 98765 43210',
      'contact@ironpulse.fitness',
      '42 Muscle Beach Way, Bandra West, Mumbai',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&auto=format&fit=crop&q=80'
    ) returning id into v_gym_id;
  end if;

  -- 2. Create Plans
  insert into public.membership_plans (gym_id, name, duration_days, price, description, is_active)
  values (v_gym_id, 'Monthly Standard', 30, 1500.00, 'Full gym access with locker facilities', true)
  returning id into v_plan_monthly_id;

  insert into public.membership_plans (gym_id, name, duration_days, price, description, is_active)
  values (v_gym_id, 'Quarterly Pro', 90, 4000.00, 'Full gym access + 1 free trainer consultation', true)
  returning id into v_plan_quarterly_id;

  insert into public.membership_plans (gym_id, name, duration_days, price, description, is_active)
  values (v_gym_id, 'Annual Elite', 365, 14000.00, 'Unlimited all-hours access + sauna & nutrition guide', true)
  returning id into v_plan_annual_id;

  -- 3. Create Demo Members & Memberships

  -- Member 1: Due Today
  insert into public.members (gym_id, full_name, phone, email, status)
  values (v_gym_id, 'Aarav Sharma', '+919876543210', 'aarav.sharma@example.com', 'active')
  returning id into v_member_due_id;

  insert into public.memberships (gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status)
  values (v_gym_id, v_member_due_id, v_plan_monthly_id, 'Monthly Standard', 1500.00, current_date, current_date, current_date + 30, 'pending')
  returning id into v_membership_due_id;

  -- Member 2: Overdue (Due 5 days ago)
  insert into public.members (gym_id, full_name, phone, email, status)
  values (v_gym_id, 'Priya Patel', '+919812345678', 'priya.patel@example.com', 'active')
  returning id into v_member_overdue_id;

  insert into public.memberships (gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status)
  values (v_gym_id, v_member_overdue_id, v_plan_quarterly_id, 'Quarterly Pro', 4000.00, current_date - 95, current_date - 5, current_date - 5, 'pending')
  returning id into v_membership_overdue_id;

  -- Member 3: Partial Paid (₹500 paid of ₹1500)
  insert into public.members (gym_id, full_name, phone, email, status)
  values (v_gym_id, 'Rahul Verma', '+919765432109', 'rahul.verma@example.com', 'active')
  returning id into v_member_partial_id;

  insert into public.memberships (gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status)
  values (v_gym_id, v_member_partial_id, v_plan_monthly_id, 'Monthly Standard', 1500.00, current_date - 10, current_date + 20, current_date + 20, 'partial')
  returning id into v_membership_partial_id;

  insert into public.payments (gym_id, member_id, membership_id, amount, payment_method, status, notes)
  values (v_gym_id, v_member_partial_id, v_membership_partial_id, 500.00, 'upi', 'paid', 'Initial deposit');

  -- Member 4: Paid in Full
  insert into public.members (gym_id, full_name, phone, email, status)
  values (v_gym_id, 'Ananya Iyer', '+919988776655', 'ananya.iyer@example.com', 'active')
  returning id into v_member_paid_id;

  insert into public.memberships (gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status)
  values (v_gym_id, v_member_paid_id, v_plan_monthly_id, 'Monthly Standard', 1500.00, current_date - 20, current_date + 10, current_date + 10, 'paid')
  returning id into v_membership_paid_id;

  insert into public.payments (gym_id, member_id, membership_id, amount, payment_method, status, notes)
  values (v_gym_id, v_member_paid_id, v_membership_paid_id, 1500.00, 'cash', 'paid', 'Full payment cash at reception');

  -- 4. Create Demo Registration Request from QR
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
    'Rohan Mehta',
    '+919823456789',
    'rohan.mehta@example.com',
    v_plan_monthly_id,
    'Monthly Standard',
    1500.00,
    'pending'
  );

end $$;
