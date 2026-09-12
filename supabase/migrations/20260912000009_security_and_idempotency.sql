-- ==============================================================================
-- MIGRATION: 20260912000009_security_and_idempotency
-- PURPOSE: Fix RLS, Idempotency, Hard Deletions, and RPC Security
-- ==============================================================================

-- 1. OPERATION IDEMPOTENCY TABLE
CREATE TABLE IF NOT EXISTS public.operation_idempotency (
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  operation_type text NOT NULL,
  payload_hash text NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (gym_id, idempotency_key)
);

ALTER TABLE public.operation_idempotency ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage idempotency"
  ON public.operation_idempotency FOR ALL
  TO authenticated
  USING (gym_id = public.current_user_gym_id())
  WITH CHECK (gym_id = public.current_user_gym_id());

-- 2. SECURE PUBLIC GYM LOOKUP (RPC for anon)
CREATE OR REPLACE FUNCTION public.get_public_gym_details(p_slug_or_domain text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym record;
  v_plans jsonb;
BEGIN
  -- We ONLY return non-sensitive fields
  SELECT id, name, slug, phone, email, address, logo_url, brand_color, custom_domain
  INTO v_gym
  FROM public.gyms
  WHERE LOWER(custom_domain) = LOWER(p_slug_or_domain) OR slug = LOWER(p_slug_or_domain)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'duration_days', duration_days,
      'price', price,
      'description', description,
      'image_url', image_url,
      'features', features
    )
  ), '[]'::jsonb)
  INTO v_plans
  FROM public.membership_plans
  WHERE gym_id = v_gym.id AND is_active = true;

  RETURN jsonb_build_object(
    'gym', jsonb_build_object(
      'id', v_gym.id,
      'name', v_gym.name,
      'slug', v_gym.slug,
      'phone', v_gym.phone,
      'email', v_gym.email,
      'address', v_gym.address,
      'logo_url', v_gym.logo_url,
      'brand_color', v_gym.brand_color,
      'custom_domain', v_gym.custom_domain
    ),
    'plans', v_plans
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_gym_details(text) TO anon, authenticated;

-- 3. SOFT DELETE MEMBER (Replaces hard delete)
CREATE OR REPLACE FUNCTION public.delete_member(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_gym_id uuid;
  v_member record;
BEGIN
  v_owner_gym_id := public.current_user_gym_id();
  IF v_owner_gym_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized: no gym associated with current user';
  END IF;

  SELECT * INTO v_member FROM public.members WHERE id = p_member_id AND gym_id = v_owner_gym_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found or not authorized to delete';
  END IF;

  IF v_member.status = 'inactive' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Member already inactive');
  END IF;

  UPDATE public.members SET status = 'inactive', updated_at = now() WHERE id = p_member_id;

  -- Also cancel active memberships
  UPDATE public.memberships 
  SET lifecycle = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE member_id = p_member_id AND gym_id = v_owner_gym_id AND lifecycle = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'deleted_member_id', p_member_id
  );
END;
$$;

-- 4. ATOMIC PAYMENT WITH TRUE IDEMPOTENCY
DROP FUNCTION IF EXISTS public.record_payment(uuid, uuid, uuid, numeric, payment_method, text, text);

CREATE OR REPLACE FUNCTION public.record_payment(
  p_member_id uuid,
  p_membership_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method,
  p_notes text,
  p_idempotency_key text,
  p_payload_hash text DEFAULT 'none'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_gym_id uuid;
  v_membership record;
  v_total_paid numeric;
  v_outstanding numeric;
  v_payment_id uuid;
  v_idem record;
  v_response jsonb;
BEGIN
  v_owner_gym_id := public.current_user_gym_id();
  IF v_owner_gym_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be greater than zero'; END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_idem FROM public.operation_idempotency 
    WHERE gym_id = v_owner_gym_id AND idempotency_key = p_idempotency_key LIMIT 1;
    
    IF FOUND THEN
      IF v_idem.payload_hash != p_payload_hash THEN
        RAISE EXCEPTION 'Idempotency key collision with different payload';
      END IF;
      RETURN v_idem.response_body;
    END IF;
  END IF;

  SELECT * INTO v_membership 
  FROM public.memberships 
  WHERE id = p_membership_id AND gym_id = v_owner_gym_id AND member_id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Membership not found or unauthorized'; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
  FROM public.payments 
  WHERE membership_id = p_membership_id AND status = 'paid';

  v_outstanding := v_membership.amount_due - v_total_paid;

  IF p_amount > v_outstanding THEN
    RAISE EXCEPTION 'Payment amount exceeds outstanding balance';
  END IF;

  v_payment_id := gen_random_uuid();
  INSERT INTO public.payments (
    id, gym_id, member_id, membership_id, amount, payment_method, status, notes, idempotency_key, created_by
  ) VALUES (
    v_payment_id, v_owner_gym_id, p_member_id, p_membership_id, p_amount, p_payment_method, 'paid', p_notes, p_idempotency_key, auth.uid()
  );

  v_total_paid := v_total_paid + p_amount;
  IF v_total_paid >= v_membership.amount_due THEN
    UPDATE public.memberships SET status = 'paid', updated_at = now() WHERE id = p_membership_id;
  ELSE
    UPDATE public.memberships SET status = 'partial', updated_at = now() WHERE id = p_membership_id;
  END IF;

  INSERT INTO public.audit_logs (gym_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_owner_gym_id, auth.uid(), 'payment_recorded', 'payment', v_payment_id, 
    jsonb_build_object('amount', p_amount, 'method', p_payment_method, 'membership_id', p_membership_id)
  );

  v_response := jsonb_build_object(
    'success', true, 
    'payment_id', v_payment_id, 
    'amount_recorded', p_amount, 
    'new_outstanding', v_membership.amount_due - v_total_paid,
    'message', 'Payment recorded successfully'
  );

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.operation_idempotency (gym_id, idempotency_key, operation_type, payload_hash, response_body)
    VALUES (v_owner_gym_id, p_idempotency_key, 'record_payment', p_payload_hash, v_response);
  END IF;

  RETURN v_response;
END;
$$;

-- 5. ATOMIC RENEWAL RPC
DROP FUNCTION IF EXISTS public.renew_membership(uuid, uuid, uuid, date, numeric, payment_method, text);

CREATE OR REPLACE FUNCTION public.renew_membership(
  p_member_id uuid,
  p_plan_id uuid,
  p_start_date date,
  p_amount_paid numeric,
  p_payment_method public.payment_method,
  p_idempotency_key text,
  p_payload_hash text DEFAULT 'none'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_gym_id uuid;
  v_idem record;
  v_plan record;
  v_member record;
  v_membership_id uuid;
  v_payment_id uuid;
  v_end_date date;
  v_status public.payment_status;
  v_response jsonb;
BEGIN
  v_owner_gym_id := public.current_user_gym_id();
  IF v_owner_gym_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_idem FROM public.operation_idempotency 
    WHERE gym_id = v_owner_gym_id AND idempotency_key = p_idempotency_key LIMIT 1;
    
    IF FOUND THEN
      IF v_idem.payload_hash != p_payload_hash THEN
        RAISE EXCEPTION 'Idempotency key collision with different payload';
      END IF;
      RETURN v_idem.response_body;
    END IF;
  END IF;

  SELECT * INTO v_member FROM public.members WHERE id = p_member_id AND gym_id = v_owner_gym_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found or unauthorized'; END IF;

  SELECT * INTO v_plan FROM public.membership_plans WHERE id = p_plan_id AND gym_id = v_owner_gym_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;

  IF NOT v_plan.is_active THEN
    RAISE EXCEPTION 'Cannot renew using an inactive plan';
  END IF;

  IF p_amount_paid < 0 OR p_amount_paid > v_plan.price THEN
    RAISE EXCEPTION 'Invalid payment amount';
  END IF;

  v_end_date := p_start_date + COALESCE(v_plan.duration_days - 1, 30);
  
  IF p_amount_paid >= v_plan.price THEN
    v_status := 'paid';
  ELSIF p_amount_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  v_membership_id := gen_random_uuid();
  INSERT INTO public.memberships (
    id, gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status
  ) VALUES (
    v_membership_id, v_owner_gym_id, p_member_id, p_plan_id, v_plan.name, v_plan.price, p_start_date, p_start_date, v_end_date, v_status
  );

  UPDATE public.members SET status = 'active', updated_at = now() WHERE id = p_member_id;

  IF p_amount_paid > 0 THEN
    v_payment_id := gen_random_uuid();
    INSERT INTO public.payments (
      id, gym_id, member_id, membership_id, amount, payment_method, status, idempotency_key, created_by
    ) VALUES (
      v_payment_id, v_owner_gym_id, p_member_id, v_membership_id, p_amount_paid, p_payment_method, 'paid', p_idempotency_key, auth.uid()
    );
  END IF;

  INSERT INTO public.audit_logs (gym_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_owner_gym_id, auth.uid(), 'membership_renewed', 'membership', v_membership_id, 
    jsonb_build_object('plan_id', p_plan_id, 'amount_paid', p_amount_paid)
  );

  v_response := jsonb_build_object(
    'success', true, 
    'membership_id', v_membership_id,
    'payment_id', v_payment_id,
    'message', 'Membership renewed successfully'
  );

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.operation_idempotency (gym_id, idempotency_key, operation_type, payload_hash, response_body)
    VALUES (v_owner_gym_id, p_idempotency_key, 'renew_membership', p_payload_hash, v_response);
  END IF;

  RETURN v_response;
END;
$$;

-- 6. ATOMIC REGISTRATION CONVERSION RPC
DROP FUNCTION IF EXISTS public.convert_registration(uuid, uuid, numeric, payment_method, text, text);

CREATE OR REPLACE FUNCTION public.convert_registration(
  p_registration_id uuid,
  p_amount_paid numeric,
  p_payment_method public.payment_method,
  p_notes text,
  p_idempotency_key text,
  p_payload_hash text DEFAULT 'none'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_gym_id uuid;
  v_idem record;
  v_reg record;
  v_member_id uuid;
  v_membership_id uuid;
  v_payment_id uuid;
  v_status public.payment_status;
  v_start_date date := current_date;
  v_end_date date;
  v_plan record;
  v_response jsonb;
BEGIN
  v_owner_gym_id := public.current_user_gym_id();
  IF v_owner_gym_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_idem FROM public.operation_idempotency 
    WHERE gym_id = v_owner_gym_id AND idempotency_key = p_idempotency_key LIMIT 1;
    
    IF FOUND THEN
      IF v_idem.payload_hash != p_payload_hash THEN
        RAISE EXCEPTION 'Idempotency key collision with different payload';
      END IF;
      RETURN v_idem.response_body;
    END IF;
  END IF;

  SELECT * INTO v_reg FROM public.registration_requests 
  WHERE id = p_registration_id AND gym_id = v_owner_gym_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
  IF v_reg.status = 'converted' THEN 
    RAISE EXCEPTION 'Registration already converted without matching idempotency key';
  END IF;
  IF v_reg.status IN ('rejected', 'approved') THEN
    RAISE EXCEPTION 'Registration is not pending';
  END IF;

  SELECT * INTO v_plan FROM public.membership_plans WHERE id = v_reg.plan_id;
  
  IF p_amount_paid < 0 OR p_amount_paid > COALESCE(v_plan.price, v_reg.plan_price_snapshot) THEN
    RAISE EXCEPTION 'Invalid payment amount';
  END IF;

  SELECT id INTO v_member_id FROM public.members 
  WHERE gym_id = v_owner_gym_id AND normalized_phone = v_reg.normalized_phone LIMIT 1;

  IF NOT FOUND THEN
    v_member_id := gen_random_uuid();
    INSERT INTO public.members (id, gym_id, full_name, phone, email, normalized_phone, status)
    VALUES (v_member_id, v_owner_gym_id, v_reg.full_name, v_reg.phone, v_reg.email, v_reg.normalized_phone, 'active');
  ELSE
    UPDATE public.members
    SET status = 'active',
        full_name = v_reg.full_name,
        email = COALESCE(v_reg.email, email),
        updated_at = now()
    WHERE id = v_member_id;
  END IF;

  IF p_amount_paid >= COALESCE(v_plan.price, v_reg.plan_price_snapshot) THEN
    v_status := 'paid';
  ELSIF p_amount_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  v_end_date := v_start_date + COALESCE(v_plan.duration_days - 1, 30);

  v_membership_id := gen_random_uuid();
  INSERT INTO public.memberships (
    id, gym_id, member_id, plan_id, plan_name_snapshot, amount_due, start_date, due_date, end_date, status
  ) VALUES (
    v_membership_id, v_owner_gym_id, v_member_id, v_reg.plan_id, v_reg.plan_name_snapshot, COALESCE(v_plan.price, v_reg.plan_price_snapshot), v_start_date, v_start_date, v_end_date, v_status
  );

  IF p_amount_paid > 0 THEN
    v_payment_id := gen_random_uuid();
    INSERT INTO public.payments (
      id, gym_id, member_id, membership_id, amount, payment_method, status, notes, idempotency_key, created_by
    ) VALUES (
      v_payment_id, v_owner_gym_id, v_member_id, v_membership_id, p_amount_paid, p_payment_method, 'paid', p_notes, p_idempotency_key, auth.uid()
    );
  END IF;

  UPDATE public.registration_requests 
  SET status = 'converted', updated_at = now() 
  WHERE id = p_registration_id;

  INSERT INTO public.audit_logs (gym_id, actor_id, action, entity_type, entity_id)
  VALUES (v_owner_gym_id, auth.uid(), 'registration_approved', 'member', v_member_id);

  v_response := jsonb_build_object(
    'success', true, 
    'member_id', v_member_id,
    'membership_id', v_membership_id,
    'payment_id', v_payment_id,
    'message', 'Registration converted successfully'
  );

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.operation_idempotency (gym_id, idempotency_key, operation_type, payload_hash, response_body)
    VALUES (v_owner_gym_id, p_idempotency_key, 'convert_registration', p_payload_hash, v_response);
  END IF;

  RETURN v_response;
END;
$$;
