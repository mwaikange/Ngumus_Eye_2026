-- Delete vouchers referencing plans that will be deleted
DELETE FROM vouchers 
WHERE plan_id IN (
  SELECT id FROM plans 
  WHERE code NOT IN (
    'individual-1m', 'individual-3m', 'individual-6m', 'individual-12m',
    'family-1m', 'family-3m', 'family-6m', 'family-12m',
    'tourist-5d', 'tourist-10d', 'tourist-14d', 'tourist-30d'
  )
);

-- Delete plans that are NOT in the 12 valid plans AND have no active subscriptions
DELETE FROM plans 
WHERE code NOT IN (
  'individual-1m', 'individual-3m', 'individual-6m', 'individual-12m',
  'family-1m', 'family-3m', 'family-6m', 'family-12m',
  'tourist-5d', 'tourist-10d', 'tourist-14d', 'tourist-30d'
)
AND id NOT IN (SELECT DISTINCT plan_id FROM user_subscriptions WHERE plan_id IS NOT NULL);

-- Mark any remaining extra plans as inactive if they have subscriptions
UPDATE plans 
SET features = features || '{"deprecated": true}'::jsonb
WHERE code NOT IN (
  'individual-1m', 'individual-3m', 'individual-6m', 'individual-12m',
  'family-1m', 'family-3m', 'family-6m', 'family-12m',
  'tourist-5d', 'tourist-10d', 'tourist-14d', 'tourist-30d'
);
