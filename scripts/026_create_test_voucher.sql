-- Create or update the test voucher IND-0000-ABCDERF
-- This voucher is reusable for testing and subscribes to plan_id 4 (Individual Monthly)

-- First, delete if exists to start fresh
DELETE FROM vouchers WHERE code = 'IND-0000-ABCDERF';

-- Insert the test voucher
INSERT INTO vouchers (code, plan_id, days, issued_to_email, redeemed_by, redeemed_at)
VALUES (
  'IND-0000-ABCDERF',
  4,  -- plan_id for Individual Monthly (N$70/30d)
  30,  -- 30 days subscription
  'test@ngumueye.com',  -- Test email
  NULL,  -- Not redeemed (so it can be used)
  NULL   -- No redemption date
)
ON CONFLICT (code) DO UPDATE
SET 
  plan_id = 4,
  days = 30,
  redeemed_by = NULL,
  redeemed_at = NULL;
