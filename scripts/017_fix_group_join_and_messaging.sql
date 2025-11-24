-- Fix 409 duplicate join, 400/500 RLS errors, and messaging issues
-- Based on comprehensive error log analysis

-- 1. Fix group_members RLS policies (causing 400/500 errors)
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self read memberships" ON group_members;
DROP POLICY IF EXISTS "anyone_read_group_members" ON group_members;
DROP POLICY IF EXISTS "members_read_group_members" ON group_members;

CREATE POLICY "self read memberships"
ON group_members
FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.uid() IN (SELECT created_by FROM groups WHERE id = group_id)
);

DROP POLICY IF EXISTS "self insert memberships" ON group_members;
DROP POLICY IF EXISTS "members_insert_group_members" ON group_members;

CREATE POLICY "self insert memberships"
ON group_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- 2. Fix group_messages RLS (causing 500 on send/load)
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can read messages" ON group_messages;
DROP POLICY IF EXISTS "members_read_messages" ON group_messages;

CREATE POLICY "members can read messages"
ON group_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.user_id = auth.uid()
    AND group_members.group_id = group_messages.group_id
  )
);

DROP POLICY IF EXISTS "members can send messages" ON group_messages;
DROP POLICY IF EXISTS "members_insert_messages" ON group_messages;

CREATE POLICY "members can send messages"
ON group_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.user_id = auth.uid()
    AND group_members.group_id = group_messages.group_id
  )
);

-- 3. Ensure profiles can be read for joins (prevents 500 on profile lookup)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read profiles" ON profiles;
DROP POLICY IF EXISTS "anyone_read_profiles" ON profiles;

CREATE POLICY "public read profiles" 
ON profiles 
FOR SELECT 
USING (true);

-- 4. Ensure expires_at exists and has default
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'group_messages' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE group_messages ADD COLUMN expires_at timestamptz DEFAULT (now() + interval '24 hours');
  END IF;
END $$;

-- 5. Add helper function to check membership
CREATE OR REPLACE FUNCTION is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
    AND user_id = p_user_id
  );
$$;
