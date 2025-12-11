-- Update subscription plans with new pricing from PDF document
-- Individual Plans: 30d=N$70, 90d=N$180, 180d=N$360, 365d=N$660
-- Family Plans: 30d=N$150, 90d=N$360, 180d=N$720, 365d=N$1440
-- Tourist Plans: 5d=N$399, 10d=N$700, 14d=N$900, 365d=N$1800

-- Update Individual Plans
UPDATE plans SET 
  price_cents = 7000,
  period_days = 30,
  features = '["Incident reporting", "Community groups", "File management", "24/7 support"]'::jsonb
WHERE code = 'individual_monthly';

UPDATE plans SET 
  price_cents = 18000,
  period_days = 90,
  features = '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response"]'::jsonb
WHERE code = 'individual_3months';

UPDATE plans SET 
  price_cents = 36000,
  period_days = 180,
  features = '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response", "Free counseling session"]'::jsonb
WHERE code = 'individual_6months';

UPDATE plans SET 
  price_cents = 66000,
  period_days = 365,
  features = '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response", "Free counseling sessions"]'::jsonb
WHERE code = 'individual_12months';

-- Update Family Plans
UPDATE plans SET 
  price_cents = 15000,
  period_days = 30,
  description = 'Covers 4 Family Members',
  features = '["All individual features", "File management", "4 family members covered", "Shared dashboard"]'::jsonb
WHERE code = 'family_monthly';

UPDATE plans SET 
  price_cents = 36000,
  period_days = 90,
  description = 'Covers 4 Family Members',
  features = '["All individual features", "File management", "4 family members covered", "Shared dashboard", "Priority response"]'::jsonb
WHERE code = 'family_3months';

UPDATE plans SET 
  price_cents = 72000,
  period_days = 180,
  description = 'Covers 4 Family Members',
  features = '["All individual features", "File management", "4 family members covered", "Shared dashboard", "Priority response", "Free counseling"]'::jsonb
WHERE code = 'family_6months';

UPDATE plans SET 
  price_cents = 144000,
  period_days = 365,
  description = 'Covers 6 Family Members',
  features = '["All individual features", "File management", "6 family members covered", "Shared dashboard", "Priority response", "Free counseling sessions"]'::jsonb
WHERE code = 'family_12months';

-- Update Tourist Plans (new periods: 5d, 10d, 14d, 365d)
UPDATE plans SET 
  price_cents = 39900,
  period_days = 5,
  label = 'Tourist 5 Days',
  features = '["Incident reporting", "Community groups", "File management", "24/7 support"]'::jsonb
WHERE code = 'tourist_weekly' OR code = 'tourist_5days';

UPDATE plans SET 
  price_cents = 70000,
  period_days = 10,
  label = 'Tourist 10 Days',
  features = '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response"]'::jsonb
WHERE code = 'tourist_2weeks' OR code = 'tourist_10days';

UPDATE plans SET 
  price_cents = 90000,
  period_days = 14,
  label = 'Tourist 14 Days',
  features = '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response"]'::jsonb
WHERE code = 'tourist_monthly' OR code = 'tourist_14days';

UPDATE plans SET 
  price_cents = 180000,
  period_days = 365,
  label = 'Tourist 12 Months',
  features = '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response", "Free counseling"]'::jsonb
WHERE code = 'tourist_12months';

-- Insert new tourist plans if they don't exist
INSERT INTO plans (code, label, price_cents, period_days, package_type, description, features)
SELECT 'tourist_5days', 'Tourist 5 Days', 39900, 5, 'tourist', 'Short stay coverage', '["Incident reporting", "Community groups", "File management", "24/7 support"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE code = 'tourist_5days');

INSERT INTO plans (code, label, price_cents, period_days, package_type, description, features)
SELECT 'tourist_10days', 'Tourist 10 Days', 70000, 10, 'tourist', 'Extended stay coverage', '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE code = 'tourist_10days');

INSERT INTO plans (code, label, price_cents, period_days, package_type, description, features)
SELECT 'tourist_14days', 'Tourist 14 Days', 90000, 14, 'tourist', 'Two week coverage', '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE code = 'tourist_14days');

INSERT INTO plans (code, label, price_cents, period_days, package_type, description, features)
SELECT 'tourist_12months', 'Tourist 12 Months', 180000, 365, 'tourist', 'Full year coverage', '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response", "Free counseling"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE code = 'tourist_12months');

-- Log the updates
DO $$
BEGIN
  RAISE NOTICE 'Plans pricing updated successfully';
  RAISE NOTICE 'Individual: 30d=N$70, 90d=N$180, 180d=N$360, 365d=N$660';
  RAISE NOTICE 'Family: 30d=N$150, 90d=N$360, 180d=N$720, 365d=N$1440';
  RAISE NOTICE 'Tourist: 5d=N$399, 10d=N$700, 14d=N$900, 365d=N$1800';
END $$;
