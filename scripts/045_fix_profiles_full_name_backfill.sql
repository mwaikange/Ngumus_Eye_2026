-- Fix profiles.full_name to match auth.users display names
-- This corrects the mismatch where profiles.full_name has wrong values like "GMp467" and "Stakes boy"

-- Step 1: Update profiles.full_name from auth.users raw_user_meta_data
-- Force update for incorrect values (GMp467, Stakes boy, User XXXXX patterns)
UPDATE profiles p
SET full_name = COALESCE(
  (SELECT au.raw_user_meta_data->>'display_name' FROM auth.users au WHERE au.id = p.id),
  (SELECT au.raw_user_meta_data->>'full_name' FROM auth.users au WHERE au.id = p.id),
  (SELECT au.raw_user_meta_data->>'name' FROM auth.users au WHERE au.id = p.id),
  (SELECT split_part(au.email, '@', 1) FROM auth.users au WHERE au.id = p.id)
)
WHERE p.full_name IS NULL 
   OR p.full_name LIKE 'User %' 
   OR p.full_name LIKE 'GMp%' 
   OR p.full_name LIKE 'Stakes %'
   OR p.full_name = '';

-- Step 2: Update display_name to equal full_name ONLY where display_name is NULL
-- This preserves user customizations to display_name
UPDATE profiles
SET display_name = full_name
WHERE display_name IS NULL OR display_name = '';

-- Step 3: Ensure email is set from auth.users
UPDATE profiles p
SET email = (SELECT au.email FROM auth.users au WHERE au.id = p.id)
WHERE p.email IS NULL;

-- Step 4: Ensure phone is set from auth.users metadata
UPDATE profiles p
SET phone = (SELECT au.raw_user_meta_data->>'phone' FROM auth.users au WHERE au.id = p.id)
WHERE p.phone IS NULL AND EXISTS (
  SELECT 1 FROM auth.users au 
  WHERE au.id = p.id AND au.raw_user_meta_data->>'phone' IS NOT NULL
);

-- Report results
DO $$
DECLARE
  total_profiles INTEGER;
  fixed_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM profiles;
  SELECT COUNT(*) INTO fixed_profiles FROM profiles WHERE full_name IS NOT NULL AND full_name NOT LIKE 'User %';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Profiles backfill complete!';
  RAISE NOTICE 'Total profiles: %', total_profiles;
  RAISE NOTICE 'Profiles with proper full_name: %', fixed_profiles;
  RAISE NOTICE '=================================================';
END $$;
