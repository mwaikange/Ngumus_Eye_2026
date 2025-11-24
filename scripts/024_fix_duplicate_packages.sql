-- Fix duplicate and misplaced membership packages
-- This script:
-- 1. Updates vouchers and user_subscriptions to point to the correct plan before deletion
-- 2. Removes duplicate Individual Monthly packages
-- 3. Moves misplaced Family package to correct category
-- 4. Moves misplaced Tourist package to correct category

-- Step 1a: Update any vouchers that reference duplicate plans to use the main plan (id:4)
UPDATE vouchers 
SET plan_id = 4 
WHERE plan_id IN (1, 15);

-- Step 1b: Update any user_subscriptions that reference duplicate plans to use the main plan (id:4)
-- Added user_subscriptions update to handle foreign key constraint
UPDATE user_subscriptions 
SET plan_id = 4 
WHERE plan_id IN (1, 15);

-- Step 2: Now delete duplicate individual monthly packages (keep id:4, delete ids 1 and 15)
DELETE FROM plans WHERE id IN (1, 15);

-- Step 3: Fix misplaced Family Package - move from individual to family category
UPDATE plans 
SET package_type = 'family' 
WHERE id = 2 AND code = 'FAMILY';

-- Step 4: Fix misplaced Tourist Package - move from individual to tourist category
UPDATE plans 
SET package_type = 'tourist' 
WHERE id = 3 AND code = 'TOURIST';

-- Verify the changes
SELECT id, code, label, period_days, price_cents, package_type 
FROM plans 
ORDER BY package_type, price_cents, period_days;
