-- Backfill reporter_name in cases table from profiles.full_name
-- This ensures all existing cases have proper reporter names

-- Update all cases where reporter_name is null or 'Unknown'
UPDATE cases c
SET reporter_name = p.full_name,
    reporter_email = COALESCE(c.reporter_email, p.email),
    reporter_phone = COALESCE(c.reporter_phone, p.phone)
FROM profiles p
WHERE c.user_id = p.id
  AND (c.reporter_name IS NULL OR c.reporter_name = 'Unknown' OR c.reporter_name = '');

-- Log the results
DO $$
DECLARE
  total_cases INT;
  cases_with_reporter INT;
BEGIN
  SELECT COUNT(*) INTO total_cases FROM cases;
  SELECT COUNT(*) INTO cases_with_reporter FROM cases WHERE reporter_name IS NOT NULL AND reporter_name != '';
  
  RAISE NOTICE 'Cases backfill complete:';
  RAISE NOTICE '  Total cases: %', total_cases;
  RAISE NOTICE '  Cases with reporter_name: %', cases_with_reporter;
END $$;
