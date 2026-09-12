-- ==============================================================================
-- MIGRATION: 20260912000008_payment_integrity
-- PURPOSE: Production hardening, Payment integrity, Idempotency, Atomic RPCs
-- ==============================================================================

-- 1. NORMALIZED PHONE
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS normalized_phone text;
ALTER TABLE public.registration_requests ADD COLUMN IF NOT EXISTS normalized_phone text;

-- Update existing rows (strip all non-digits, prepend +91 for standard Indian numbers if length is 10)
UPDATE public.members 
SET normalized_phone = CASE 
  WHEN LENGTH(REGEXP_REPLACE(phone, '\D', '', 'g')) >= 10 
  THEN '+91' || RIGHT(REGEXP_REPLACE(phone, '\D', '', 'g'), 10)
  ELSE NULL 
END
WHERE normalized_phone IS NULL;

UPDATE public.registration_requests 
SET normalized_phone = CASE 
  WHEN LENGTH(REGEXP_REPLACE(phone, '\D', '', 'g')) >= 10 
  THEN '+91' || RIGHT(REGEXP_REPLACE(phone, '\D', '', 'g'), 10)
  ELSE NULL 
END
WHERE normalized_phone IS NULL;

-- 2. PAYMENT IDEMPOTENCY
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Prevent duplicate idempotency keys within the same gym
DROP INDEX IF EXISTS payments_idempotency_idx;
CREATE UNIQUE INDEX payments_idempotency_idx ON public.payments(gym_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2.5 DEDUPLICATE EXISTING MEMBERS BY (gym_id, normalized_phone)
-- If duplicate members already exist in the database, merge their memberships and payments to the primary record
DO $$
DECLARE
  r RECORD;
  v_keeper_id uuid;
  v_dup_id uuid;
BEGIN
  FOR r IN (
    SELECT gym_id, normalized_phone
    FROM public.members
    WHERE normalized_phone IS NOT NULL
    GROUP BY gym_id, normalized_phone
    HAVING count(*) > 1
  ) LOOP
    -- Prefer active member, then latest updated_at/created_at
    SELECT id INTO v_keeper_id
    FROM public.members
    WHERE gym_id = r.gym_id AND normalized_phone = r.normalized_phone
    ORDER BY (CASE WHEN status = 'active' THEN 1 ELSE 2 END), updated_at DESC, created_at DESC
    LIMIT 1;

    -- Re-link all dependent records from duplicates to the keeper record
    FOR v_dup_id IN (
      SELECT id
      FROM public.members
      WHERE gym_id = r.gym_id 
        AND normalized_phone = r.normalized_phone
        AND id <> v_keeper_id
    ) LOOP
      UPDATE public.memberships
      SET member_id = v_keeper_id
      WHERE member_id = v_dup_id;

      UPDATE public.payments
      SET member_id = v_keeper_id
      WHERE member_id = v_dup_id;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_logs') THEN
        UPDATE public.automation_logs
        SET member_id = v_keeper_id
        WHERE member_id = v_dup_id;
      END IF;

      UPDATE public.audit_logs
      SET entity_id = v_keeper_id
      WHERE entity_type = 'member' AND entity_id = v_dup_id;

      DELETE FROM public.members
      WHERE id = v_dup_id;
    END LOOP;
  END LOOP;
END;
$$;

-- 3. MEMBER PHONE UNIQUENESS
-- Prevent concurrent duplicate member creation
DROP INDEX IF EXISTS members_gym_normalized_phone_idx;
CREATE UNIQUE INDEX members_gym_normalized_phone_idx ON public.members(gym_id, normalized_phone) WHERE normalized_phone IS NOT NULL;


-- ==============================================================================
-- 4. ATOMIC PAYMENT RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.record_payment(
  p_gym_id uuid,
  p_member_id uuid,
  p_membership_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method,
  p_notes text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_membership record;
  v_total_paid numeric;
  v_outstanding numeric;
  v_payment_id uuid;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  -- Check idempotency first (if key provided, check if payment already exists)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_payment_id FROM public.payments 
    WHERE gym_id = p_gym_id AND idempotency_key = p_idempotency_key LIMIT 1;
    
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'message', 'Payment already recorded (idempotent)');
    END IF;
  END IF;

  -- Lock the membership row to prevent concurrent modifications
  SELECT * INTO v_membership 
  FROM public.memberships 
  WHERE id = p_membership_id AND gym_id = p_gym_id AND member_id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found or unauthorized';
  END IF;

  -- Calculate current paid amount for this membership
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
  FROM public.payments 
  WHERE membership_id = p_membership_id AND status = 'paid';

  -- Calculate outstanding
  v_outstanding := v_membership.amount_due - v_total_paid;

  -- Validate overpayment
  IF p_amount > v_outstanding THEN
    RAISE EXCEPTION 'Payment amount exceeds outstanding balance';
  END IF;

  -- Insert payment
  INSERT INTO public.payments (
    gym_id, member_id, membership_id, amount, payment_method, status, notes, idempotency_key, created_by
  ) VALUES (
    p_gym_id, p_member_id, p_membership_id, p_amount, p_payment_method, 'paid', p_notes, p_idempotency_key, auth.uid()
  ) RETURNING id INTO v_payment_id;

  -- Update membership status logically based on new total
  v_total_paid := v_total_paid + p_amount;
  IF v_total_paid >= v_membership.amount_due THEN
    UPDATE public.memberships SET status = 'paid', updated_at = now() WHERE id = p_membership_id;
  ELSE
    UPDATE public.memberships SET status = 'partial', updated_at = now() WHERE id = p_membership_id;
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (gym_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_gym_id, auth.uid(), 'payment_recorded', 'payment', v_payment_id, 
    jsonb_build_object('amount', p_amount, 'method', p_payment_method, 'membership_id', p_membership_id)
  );

  RETURN jsonb_build_object(
    'success', true, 
    'payment_id', v_payment_id, 
    'amount_recorded', p_amount, 
    'new_outstanding', v_membership.amount_due - v_total_paid
  );
END;
$$;


-- ==============================================================================
-- 5. ATOMIC RENEWAL RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.renew_membership(
  p_gym_id uuid,
  p_member_id uuid,
  p_plan_id uuid,
  p_start_date date,
  p_amount_paid numeric,
  p_payment_method public.payment_method,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan record;
  v_member record;
  v_membership_id uuid;
  v_payment_id uuid;
  v_end_date date;
  v_status public.payment_status;
BEGIN
  -- Verify member lock
  SELECT * INTO v_member FROM public.members WHERE id = p_member_id AND gym_id = p_gym_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found or unauthorized'; END IF;

  -- Verify plan
  SELECT * INTO v_plan FROM public.membership_plans WHERE id = p_plan_id AND gym_id = p_gym_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;

  IF NOT v_plan.is_active THEN
    RAISE EXCEPTION 'Cannot renew using an inactive plan';
  END IF;

  IF p_amount_paid < 0 OR p_amount_paid > v_plan.price THEN
    RAISE EXCEPTION 'Invalid payment amount';
  END IF;

  -- Calculate dates
  v_end_date := p_start_date + (v_plan.duration_days - 1);
  
  IF p_amount_paid >= v_plan.price THEN
    v_status := 'paid';
  ELSIF p_amount_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  -- Insert Membership
  INSERT INTO public.memberships (
    gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status
  ) VALUES (
    p_gym_id, p_member_id, p_plan_id, v_plan.name, v_plan.price, p_start_date, p_start_date, v_end_date, v_status
  ) RETURNING id INTO v_membership_id;

  -- Member Status Update (if previously inactive)
  UPDATE public.members SET status = 'active', updated_at = now() WHERE id = p_member_id;

  -- Insert Payment if amount > 0
  IF p_amount_paid > 0 THEN
    -- Generate idempotency key for this payment if not provided
    INSERT INTO public.payments (
      gym_id, member_id, membership_id, amount, payment_method, status, idempotency_key, created_by
    ) VALUES (
      p_gym_id, p_member_id, v_membership_id, p_amount_paid, p_payment_method, 'paid', p_idempotency_key, auth.uid()
    ) RETURNING id INTO v_payment_id;
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (gym_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_gym_id, auth.uid(), 'membership_renewed', 'membership', v_membership_id, 
    jsonb_build_object('plan_id', p_plan_id, 'amount_paid', p_amount_paid)
  );

  RETURN jsonb_build_object(
    'success', true, 
    'membership_id', v_membership_id,
    'payment_id', v_payment_id
  );
END;
$$;

-- ==============================================================================
-- 6. ATOMIC REGISTRATION CONVERSION RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.convert_registration(
  p_gym_id uuid,
  p_registration_id uuid,
  p_amount_paid numeric,
  p_payment_method public.payment_method,
  p_notes text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reg record;
  v_member_id uuid;
  v_membership_id uuid;
  v_payment_id uuid;
  v_status public.payment_status;
  v_start_date date := current_date;
  v_end_date date;
  v_plan record;
BEGIN
  -- Lock registration
  SELECT * INTO v_reg FROM public.registration_requests 
  WHERE id = p_registration_id AND gym_id = p_gym_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
  IF v_reg.status = 'converted' THEN 
    -- Return idempotent success if we somehow reach here
    RETURN jsonb_build_object('success', true, 'message', 'Already converted'); 
  END IF;
  IF v_reg.status IN ('rejected', 'approved') THEN
    RAISE EXCEPTION 'Registration is not pending';
  END IF;

  -- Plan checks
  SELECT * INTO v_plan FROM public.membership_plans WHERE id = v_reg.plan_id;
  
  IF p_amount_paid < 0 OR p_amount_paid > COALESCE(v_plan.price, v_reg.plan_price_snapshot) THEN
    RAISE EXCEPTION 'Invalid payment amount';
  END IF;

  -- Check if member exists by normalized phone
  SELECT id INTO v_member_id FROM public.members 
  WHERE gym_id = p_gym_id AND normalized_phone = v_reg.normalized_phone LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.members (gym_id, full_name, phone, email, normalized_phone)
    VALUES (p_gym_id, v_reg.full_name, v_reg.phone, v_reg.email, v_reg.normalized_phone)
    RETURNING id INTO v_member_id;
  ELSE
    -- Re-activate cancelled/inactive member with updated details
    UPDATE public.members
    SET status = 'active',
        full_name = v_reg.full_name,
        email = COALESCE(v_reg.email, email),
        updated_at = now()
    WHERE id = v_member_id;
  END IF;

  -- Calculate membership status
  IF p_amount_paid >= COALESCE(v_plan.price, v_reg.plan_price_snapshot) THEN
    v_status := 'paid';
  ELSIF p_amount_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  v_end_date := v_start_date + COALESCE(v_plan.duration_days - 1, 30);

  -- Insert Membership
  INSERT INTO public.memberships (
    gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status
  ) VALUES (
    p_gym_id, v_member_id, v_reg.plan_id, v_reg.plan_name_snapshot, COALESCE(v_plan.price, v_reg.plan_price_snapshot), v_start_date, v_start_date, v_end_date, v_status
  ) RETURNING id INTO v_membership_id;

  -- Insert Payment if amount > 0
  IF p_amount_paid > 0 THEN
    INSERT INTO public.payments (
      gym_id, member_id, membership_id, amount, payment_method, status, notes, idempotency_key, created_by
    ) VALUES (
      p_gym_id, v_member_id, v_membership_id, p_amount_paid, p_payment_method, 'paid', p_notes, p_idempotency_key, auth.uid()
    ) RETURNING id INTO v_payment_id;
  END IF;

  -- Mark converted
  UPDATE public.registration_requests 
  SET status = 'converted', updated_at = now() 
  WHERE id = p_registration_id;

  -- Audit log
  INSERT INTO public.audit_logs (gym_id, actor_id, action, entity_type, entity_id)
  VALUES (p_gym_id, auth.uid(), 'registration_approved', 'member', v_member_id);

  RETURN jsonb_build_object(
    'success', true, 
    'member_id', v_member_id,
    'membership_id', v_membership_id,
    'payment_id', v_payment_id
  );
END;
$$;


-- ==============================================================================
-- 7. PAYMENT RLS & IMMUTABILITY
-- ==============================================================================
-- Drop existing update/delete policies for payments (normal owners should not be able to modify historical financial data)
DROP POLICY IF EXISTS "Owners can update payments" ON public.payments;
DROP POLICY IF EXISTS "Owners can delete payments" ON public.payments;

-- Ensure INSERT is only allowed if the gym matches the current user's profile gym
DROP POLICY IF EXISTS "Owners can insert payments" ON public.payments;
CREATE POLICY "Owners can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK ( gym_id = public.current_user_gym_id() );

-- Ensure SELECT is only allowed if the gym matches the current user's profile gym
DROP POLICY IF EXISTS "Owners can view payments" ON public.payments;
CREATE POLICY "Owners can view payments"
  ON public.payments FOR SELECT
  USING ( gym_id = public.current_user_gym_id() );


-- ==============================================================================
-- 8. PROFILE GYM SWITCH VULNERABILITY
-- ==============================================================================
-- Prevent users from arbitrarily changing their assigned gym_id in their profile
CREATE OR REPLACE FUNCTION public.prevent_profile_gym_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.gym_id IS NOT NULL AND NEW.gym_id != OLD.gym_id THEN
    RAISE EXCEPTION 'Cannot change gym assignment once set. Contact support.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_gym_mutation_trigger ON public.profiles;
CREATE TRIGGER prevent_profile_gym_mutation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_gym_mutation();


-- ==============================================================================
-- 9. DASHBOARD DB SOURCE OF TRUTH (AGGREGATES)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_gym_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_members int;
  v_today_collection numeric;
  v_month_collection numeric;
  v_total_outstanding numeric;
  v_due_today_count int;
  v_due_today_amount numeric;
  v_overdue_count int;
  v_overdue_amount numeric;
  
  v_today date := current_date;
  v_month_start date := date_trunc('month', current_date);
BEGIN
  -- Active members
  SELECT count(*) INTO v_active_members 
  FROM public.members WHERE gym_id = p_gym_id AND status = 'active';

  -- Today collection
  SELECT COALESCE(SUM(amount), 0) INTO v_today_collection 
  FROM public.payments 
  WHERE gym_id = p_gym_id AND status = 'paid' AND paid_at::date = v_today;

  -- Month collection
  SELECT COALESCE(SUM(amount), 0) INTO v_month_collection 
  FROM public.payments 
  WHERE gym_id = p_gym_id AND status = 'paid' AND paid_at >= v_month_start;

  -- Memberships stats
  SELECT 
    COALESCE(SUM(amount_due), 0) INTO v_total_outstanding 
  FROM (
    SELECT (m.amount_due - COALESCE((SELECT SUM(amount) FROM public.payments p WHERE p.membership_id = m.id AND p.status = 'paid'), 0)) as amount_due
    FROM public.memberships m
    WHERE m.gym_id = p_gym_id AND m.status IN ('pending', 'partial')
  ) q WHERE q.amount_due > 0;

  -- Due today
  SELECT 
    count(*), COALESCE(SUM(calc_due), 0)
    INTO v_due_today_count, v_due_today_amount
  FROM (
    SELECT (m.amount_due - COALESCE((SELECT SUM(amount) FROM public.payments p WHERE p.membership_id = m.id AND p.status = 'paid'), 0)) as calc_due
    FROM public.memberships m
    WHERE m.gym_id = p_gym_id AND m.due_date = v_today AND m.status IN ('pending', 'partial')
  ) q WHERE q.calc_due > 0;

  -- Overdue
  SELECT 
    count(*), COALESCE(SUM(calc_due), 0)
    INTO v_overdue_count, v_overdue_amount
  FROM (
    SELECT (m.amount_due - COALESCE((SELECT SUM(amount) FROM public.payments p WHERE p.membership_id = m.id AND p.status = 'paid'), 0)) as calc_due
    FROM public.memberships m
    WHERE m.gym_id = p_gym_id AND m.due_date < v_today AND m.status IN ('pending', 'partial')
  ) q WHERE q.calc_due > 0;

  RETURN jsonb_build_object(
    'activeMembers', v_active_members,
    'totalCollectionToday', v_today_collection,
    'totalCollectionMonth', v_month_collection,
    'totalOutstanding', v_total_outstanding,
    'dueTodayCount', v_due_today_count,
    'dueTodayAmount', v_due_today_amount,
    'overdueCount', v_overdue_count,
    'overdueAmount', v_overdue_amount
  );
END;
$$;


-- ==============================================================================
-- 10. PROTECT FINANCIAL HISTORY FROM CASCADE DELETE
-- ==============================================================================
-- We don't want payments or memberships to be deleted if a member is deleted
ALTER TABLE public.payments ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_member_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

ALTER TABLE public.memberships ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_member_id_fkey;
ALTER TABLE public.memberships ADD CONSTRAINT memberships_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- If member is set to NULL, we still need to know who the payment belonged to, 
-- but since MVP relies on soft-delete ('inactive' status), we primarily just 
-- prevent hard-deletion from breaking the database.

-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================

-- ==============================================================================
-- 11. PUBLIC QR REGISTRATION UPDATE
-- ==============================================================================
-- We need to update create_registration_request to compute normalized_phone
CREATE OR REPLACE FUNCTION public.create_registration_request(
  p_gym_slug text,
  p_full_name text,
  p_phone text,
  p_email text,
  p_plan_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_id uuid;
  v_plan record;
  v_registration_id uuid;
  v_normalized_phone text;
BEGIN
  -- Validate gym exists (also checking custom domain if needed)
  SELECT id INTO v_gym_id
  FROM public.gyms
  WHERE slug = p_gym_slug OR custom_domain = p_gym_slug LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gym not found for slug/domain %', p_gym_slug;
  END IF;

  -- Validate plan exists and belongs to gym
  SELECT id, name, price INTO v_plan
  FROM public.membership_plans
  WHERE id = p_plan_id AND gym_id = v_gym_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership plan not found or inactive';
  END IF;

  -- Compute normalized phone (basic Indian logic)
  v_normalized_phone := '+91' || RIGHT(REGEXP_REPLACE(p_phone, '\D', '', 'g'), 10);

  -- Insert registration
  INSERT INTO public.registration_requests (
    gym_id, full_name, phone, email, plan_id, plan_name_snapshot, plan_price_snapshot, status, normalized_phone
  )
  VALUES (
    v_gym_id, p_full_name, p_phone, p_email, p_plan_id, v_plan.name, v_plan.price, 'pending', v_normalized_phone
  )
  RETURNING id INTO v_registration_id;

  RETURN jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'message', 'Registration submitted successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_registration_request(text, text, text, text, uuid) TO anon, authenticated;

