-- Backfill missing data in profiles table
-- This script populates full_name, email, phone, and display_name from existing data sources

-- Removed fallback to profiles.display_name - full_name only comes from auth.users
-- 1. Update full_name from auth.users metadata where available (IMMUTABLE - never changes after this)
UPDATE profiles p
SET full_name = u.raw_user_meta_data ->> 'display_name'
FROM auth.users u
WHERE p.id = u.id 
  AND p.full_name IS NULL 
  AND u.raw_user_meta_data ->> 'display_name' IS NOT NULL;

-- 2. Update email from auth.users table where email is null
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id 
  AND p.email IS NULL 
  AND u.email IS NOT NULL;

-- 3. Update phone from auth.users metadata where phone is null
UPDATE profiles p
SET phone = u.raw_user_meta_data ->> 'phone'
FROM auth.users u
WHERE p.id = u.id 
  AND p.phone IS NULL 
  AND u.raw_user_meta_data ->> 'phone' IS NOT NULL;

-- display_name defaults to full_name ONLY when NULL (user can customize it later)
-- 4. Set display_name equal to full_name where display_name is null
UPDATE profiles
SET display_name = full_name
WHERE display_name IS NULL AND full_name IS NOT NULL;

-- 5. Set default full_name for profiles that still have null values
UPDATE profiles
SET full_name = 'User ' || SUBSTRING(id::text, 1, 8)
WHERE full_name IS NULL;

-- 6. Set default display_name equal to full_name for any remaining null display_names
UPDATE profiles
SET display_name = full_name
WHERE display_name IS NULL;

-- 7. Log the results
DO $$
DECLARE
  total_profiles INT;
  profiles_with_name INT;
  profiles_with_email INT;
  profiles_with_phone INT;
  profiles_with_display_name INT;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM profiles;
  SELECT COUNT(*) INTO profiles_with_name FROM profiles WHERE full_name IS NOT NULL;
  SELECT COUNT(*) INTO profiles_with_email FROM profiles WHERE email IS NOT NULL;
  SELECT COUNT(*) INTO profiles_with_phone FROM profiles WHERE phone IS NOT NULL;
  SELECT COUNT(*) INTO profiles_with_display_name FROM profiles WHERE display_name IS NOT NULL;
  
  RAISE NOTICE 'Profiles backfill complete:';
  RAISE NOTICE '  Total profiles: %', total_profiles;
  RAISE NOTICE '  Profiles with full_name: %', profiles_with_name;
  RAISE NOTICE '  Profiles with email: %', profiles_with_email;
  RAISE NOTICE '  Profiles with phone: %', profiles_with_phone;
  RAISE NOTICE '  Profiles with display_name: %', profiles_with_display_name;
END $$;
