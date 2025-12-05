-- Fix profiles table: Add full_name and email columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Remove lat/lng from cases, add town field
ALTER TABLE cases
  DROP COLUMN IF EXISTS location_lat,
  DROP COLUMN IF EXISTS location_lng,
  ADD COLUMN IF NOT EXISTS town TEXT;

-- Add comment to clarify display_name defaults to full_name
COMMENT ON COLUMN profiles.display_name IS 'Display name for feed posts. Defaults to full_name if not set';
COMMENT ON COLUMN profiles.full_name IS 'Real name (first + last) used for case reporting';
COMMENT ON COLUMN profiles.email IS 'User email for case reporting and notifications';
COMMENT ON COLUMN cases.town IS 'Town/city where the incident occurred';
