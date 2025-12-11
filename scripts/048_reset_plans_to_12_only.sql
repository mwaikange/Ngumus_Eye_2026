-- Reset plans table to only the 12 valid plans
-- Using correct column names from actual schema:
-- id, code, label, description, price_cents, duration_type, duration_length, period_days, package_type, features

-- First delete vouchers that reference plans
DELETE FROM vouchers;

-- Delete plans that have NO active subscriptions (safe to delete)
DELETE FROM plans 
WHERE id NOT IN (SELECT DISTINCT plan_id FROM user_subscriptions WHERE plan_id IS NOT NULL);

-- INDIVIDUAL PLANS (4)
INSERT INTO plans (code, label, description, price_cents, duration_type, duration_length, period_days, package_type, features) VALUES
('individual_1m', 'Individual 1 Month', 'Perfect for personal safety and security', 7000, 'month', 1, 30, 'individual', '["Incident reporting", "Community groups", "File management", "24/7 support"]'::jsonb),
('individual_3m', 'Individual 3 Months', 'Perfect for personal safety and security', 18000, 'month', 3, 90, 'individual', '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response"]'::jsonb),
('individual_6m', 'Individual 6 Months', 'Perfect for personal safety and security', 36000, 'month', 6, 180, 'individual', '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response", "Free counseling session"]'::jsonb),
('individual_12m', 'Individual 12 Months', 'Perfect for personal safety and security', 66000, 'month', 12, 365, 'individual', '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response", "Free counseling sessions"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  duration_type = EXCLUDED.duration_type,
  duration_length = EXCLUDED.duration_length,
  period_days = EXCLUDED.period_days,
  package_type = EXCLUDED.package_type,
  features = EXCLUDED.features;

-- FAMILY PLANS (4)
INSERT INTO plans (code, label, description, price_cents, duration_type, duration_length, period_days, package_type, features) VALUES
('family_1m', 'Family 1 Month', 'Protect your whole family together', 15000, 'month', 1, 30, 'family', '["All individual features", "File management", "4 family members covered", "Priority response"]'::jsonb),
('family_3m', 'Family 3 Months', 'Protect your whole family together', 36000, 'month', 3, 90, 'family', '["All individual features", "File management", "4 family members covered", "Priority response", "Free counseling"]'::jsonb),
('family_6m', 'Family 6 Months', 'Protect your whole family together', 72000, 'month', 6, 180, 'family', '["All individual features", "File management", "4 family members covered", "Priority response", "Free counseling"]'::jsonb),
('family_12m', 'Family 12 Months', 'Protect your whole family together', 144000, 'month', 12, 365, 'family', '["All individual features", "File management", "6 family members covered", "Priority response", "Free counseling sessions"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  duration_type = EXCLUDED.duration_type,
  duration_length = EXCLUDED.duration_length,
  period_days = EXCLUDED.period_days,
  package_type = EXCLUDED.package_type,
  features = EXCLUDED.features;

-- TOURIST PLANS (4)
INSERT INTO plans (code, label, description, price_cents, duration_type, duration_length, period_days, package_type, features) VALUES
('tourist_5d', 'Tourist 5 Days', 'Short-term coverage for visitors', 39900, 'day', 5, 5, 'tourist', '["Incident reporting", "Community groups", "File management", "24/7 support"]'::jsonb),
('tourist_10d', 'Tourist 10 Days', 'Short-term coverage for visitors', 70000, 'day', 10, 10, 'tourist', '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response"]'::jsonb),
('tourist_14d', 'Tourist 14 Days', 'Short-term coverage for visitors', 90000, 'day', 14, 14, 'tourist', '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response"]'::jsonb),
('tourist_30d', 'Tourist 30 Days', 'Short-term coverage for visitors', 180000, 'day', 30, 30, 'tourist', '["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response", "Free counseling"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  duration_type = EXCLUDED.duration_type,
  duration_length = EXCLUDED.duration_length,
  period_days = EXCLUDED.period_days,
  package_type = EXCLUDED.package_type,
  features = EXCLUDED.features;
