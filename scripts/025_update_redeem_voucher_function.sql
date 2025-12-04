-- Update redeem_voucher function to:
-- 1. Check for active subscriptions first (prevent duplicates)
-- 2. Allow test voucher (IND-0000-ABCDERF) to be reusable
-- 3. Work for any new user

CREATE OR REPLACE FUNCTION public.redeem_voucher(voucher_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voucher record;
  v_plan record;
  v_expires_at timestamptz;
  v_user_id uuid;
  v_active_sub record;
  v_is_test_voucher boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if user already has an active subscription
  SELECT * INTO v_active_sub 
  FROM public.user_subscriptions 
  WHERE user_id = v_user_id 
    AND status = 'active'
    AND expires_at > now()
  LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You already have an active subscription');
  END IF;
  
  -- Get voucher
  SELECT * INTO v_voucher FROM public.vouchers WHERE code = voucher_code FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid voucher code');
  END IF;
  
  -- Check if it's the test voucher
  v_is_test_voucher := (voucher_code = 'IND-0000-ABCDERF');
  
  -- For non-test vouchers, check if already redeemed
  IF NOT v_is_test_voucher AND v_voucher.redeemed_by IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Voucher already redeemed');
  END IF;
  
  -- Get plan
  SELECT * INTO v_plan FROM public.plans WHERE id = v_voucher.plan_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid plan');
  END IF;
  
  -- Calculate expiry
  v_expires_at := now() + (COALESCE(v_voucher.days, v_plan.period_days) || ' days')::interval;
  
  -- Mark voucher as redeemed (only for non-test vouchers)
  IF NOT v_is_test_voucher THEN
    UPDATE public.vouchers
    SET redeemed_by = v_user_id, redeemed_at = now()
    WHERE code = voucher_code;
  END IF;
  
  -- Create subscription
  INSERT INTO public.user_subscriptions (user_id, plan_id, started_at, expires_at, status)
  VALUES (v_user_id, v_voucher.plan_id, now(), v_expires_at, 'active');
  
  RETURN jsonb_build_object(
    'ok', true,
    'planCode', v_plan.code,
    'expiresAt', v_expires_at
  );
END;
$$;
