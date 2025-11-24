-- Create test voucher for development and testing
-- Voucher Code: IND-0000-ABCDERF
-- This grants 30 days of Individual subscription

-- Add unique constraints required for ON CONFLICT clauses
ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_code_period_days_unique;

ALTER TABLE public.plans
  ADD CONSTRAINT plans_code_period_days_unique UNIQUE (code, period_days);

ALTER TABLE public.vouchers
  DROP CONSTRAINT IF EXISTS vouchers_code_unique;

ALTER TABLE public.vouchers
  ADD CONSTRAINT vouchers_code_unique UNIQUE (code);

-- First, ensure we have an Individual plan
-- Removed package_type and description columns that don't exist in the plans table
INSERT INTO public.plans (code, label, period_days, price_cents)
VALUES 
  ('IND', 'Individual Monthly', 30, 7000)
ON CONFLICT (code, period_days) DO UPDATE SET
  label = EXCLUDED.label,
  price_cents = EXCLUDED.price_cents;

-- Insert the test voucher
-- Removed expires_at column that doesn't exist in the vouchers table
INSERT INTO public.vouchers (
  code,
  plan_id,
  days,
  issued_to_email,
  redeemed_at,
  redeemed_by
)
SELECT 
  'IND-0000-ABCDERF',
  p.id,
  30,
  'test@ngumu.com',
  NULL,
  NULL
FROM public.plans p
WHERE p.code = 'IND' AND p.period_days = 30
ON CONFLICT (code) DO UPDATE
SET 
  redeemed_at = NULL,
  redeemed_by = NULL;

-- Grant usage to all authenticated users for testing
COMMENT ON TABLE public.vouchers IS 'Test voucher IND-0000-ABCDERF is available for testing subscription features';
