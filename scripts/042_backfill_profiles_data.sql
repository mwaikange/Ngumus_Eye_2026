-- Backfill missing data in profiles table
-- This script populates full_name, email, phone, and display_name from existing data sources

-- Pull full_name from auth.users display_name first
-- 1. Update full_name from auth.users metadata where available
UPDATE profiles p
SET full_name = u.raw_user_meta_data ->> 'display_name'
FROM auth.users u
WHERE p.id = u.id 
  AND p.full_name IS NULL 
  AND u.raw_user_meta_data ->> 'display_name' IS NOT NULL;

-- 2. Fallback: Update full_name from profiles.display_name where full_name is still null
UPDATE profiles
SET full_name = display_name
WHERE full_name IS NULL AND display_name IS NOT NULL;

-- 3. Update email from auth.users table where email is null
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id 
  AND p.email IS NULL 
  AND u.email IS NOT NULL;

-- 4. Update phone from auth.users metadata where phone is null
UPDATE profiles p
SET phone = u.raw_user_meta_data ->> 'phone'
FROM auth.users u
WHERE p.id = u.id 
  AND p.phone IS NULL 
  AND u.raw_user_meta_data ->> 'phone' IS NOT NULL;

-- Set display_name to full_name if not set (per user requirement)
-- 5. Set display_name equal to full_name where display_name is null
UPDATE profiles
SET display_name = full_name
WHERE display_name IS NULL AND full_name IS NOT NULL;

-- 6. Set default full_name for profiles that still have null values
UPDATE profiles
SET full_name = 'User ' || SUBSTRING(id::text, 1, 8)
WHERE full_name IS NULL;

-- 7. Set default display_name equal to full_name for any remaining null display_names
UPDATE profiles
SET display_name = full_name
WHERE display_name IS NULL;

-- 8. Log the results
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
