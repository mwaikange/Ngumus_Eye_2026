-- Fix Tourist package pricing
-- Change 7-day tourist package to 14 days and keep price at N$500 (50000 cents)

UPDATE plans
SET period_days = 14,
    label = 'Tourist 14 Days',
    description = 'Perfect for short-term visitors - 2 weeks of full coverage'
WHERE package_type = 'tourist'
  AND period_days = 7;

-- Ensure the test voucher uses the correct plan
UPDATE vouchers
SET plan_id = (SELECT id FROM plans WHERE code = 'TOU-14D' AND package_type = 'tourist' LIMIT 1)
WHERE code = 'IND-0000-ABCDERF'
  AND plan_id IN (SELECT id FROM plans WHERE package_type = 'tourist' AND period_days = 7);
