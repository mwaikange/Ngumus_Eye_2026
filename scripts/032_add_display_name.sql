-- Add display_name column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Function to get display name or fallback to real name
CREATE OR REPLACE FUNCTION get_display_name(profile_id UUID)
RETURNS TEXT AS $$
DECLARE
  display_name_val TEXT;
  first_name_val TEXT;
  surname_val TEXT;
BEGIN
  SELECT display_name, first_name, surname
  INTO display_name_val, first_name_val, surname_val
  FROM profiles
  WHERE id = profile_id;

  IF display_name_val IS NOT NULL AND display_name_val != '' THEN
    RETURN display_name_val;
  ELSE
    RETURN COALESCE(first_name_val || ' ' || surname_val, 'User');
  END IF;
END;
$$ LANGUAGE plpgsql;
