-- Fix Tourist Package: Change 7-day to 14-day at N$500
UPDATE plans 
SET 
  period_days = 14,
  label = 'Tourist 14 Days',
  description = 'Perfect for tourists visiting Namibia - 14 days of protection'
WHERE code = 'TOURIST' AND period_days = 7;

-- Ensure the pricing is correct (50000 cents = N$500)
UPDATE plans 
SET price_cents = 50000
WHERE code = 'TOURIST' AND period_days = 14;
