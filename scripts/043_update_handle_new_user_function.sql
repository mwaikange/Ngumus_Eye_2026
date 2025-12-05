-- Update handle_new_user function to populate all profile fields on registration
-- This ensures full_name, email, phone, and display_name are set when a user registers

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_display_name text;
BEGIN
  -- Extract full_name from metadata (sent as display_name from signup form)
  v_full_name := COALESCE(new.raw_user_meta_data ->> 'display_name', 'User');
  
  -- Set display_name equal to full_name by default
  v_display_name := v_full_name;
  
  -- Insert all fields including full_name and email
  INSERT INTO public.profiles (id, full_name, display_name, email, phone)
  VALUES (
    new.id,
    v_full_name,
    v_display_name,
    new.email,  -- Get email from auth.users
    COALESCE(new.raw_user_meta_data ->> 'phone', null)
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Log the update
DO $$
BEGIN
  RAISE NOTICE 'handle_new_user function updated to populate full_name, email, phone, and display_name';
END $$;
