-- Fix all RLS policies for groups, group_members, group_messages to prevent 409 and 500 errors

-- 1. Fix profiles RLS to allow reads for joins
DROP POLICY IF EXISTS "allow read for joins" ON profiles;
CREATE POLICY "allow read for joins"
ON profiles FOR SELECT
USING (true);

-- 2. Fix group_members RLS
DROP POLICY IF EXISTS "users_can_view_memberships" ON group_members;
DROP POLICY IF EXISTS "users can see own memberships" ON group_members;
DROP POLICY IF EXISTS "users_can_insert_membership" ON group_members;
DROP POLICY IF EXISTS "users can insert membership" ON group_members;
DROP POLICY IF EXISTS "users_can_delete_own_membership" ON group_members;
DROP POLICY IF EXISTS "authenticated_can_read_members" ON group_members;
DROP POLICY IF EXISTS "authenticated_can_join_groups" ON group_members;
DROP POLICY IF EXISTS "users_can_leave_groups" ON group_members;
DROP POLICY IF EXISTS "admins_can_remove_members" ON group_members;

-- Allow all authenticated users to read group_members
CREATE POLICY "authenticated_can_read_members"
ON group_members FOR SELECT
TO authenticated
USING (true);

-- Allow inserting membership (will handle duplicates in app layer)
CREATE POLICY "authenticated_can_join_groups"
ON group_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to leave groups
CREATE POLICY "users_can_leave_groups"
ON group_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow creators and admins to remove members
CREATE POLICY "admins_can_remove_members"
ON group_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('creator', 'admin')
  )
);

-- 3. Fix group_messages RLS
DROP POLICY IF EXISTS "members can read messages" ON group_messages;
DROP POLICY IF EXISTS "members can send messages" ON group_messages;
DROP POLICY IF EXISTS "users can delete own messages" ON group_messages;
DROP POLICY IF EXISTS "members_can_read_messages" ON group_messages;
DROP POLICY IF EXISTS "members_can_send_messages" ON group_messages;
DROP POLICY IF EXISTS "users_can_delete_own_messages" ON group_messages;

-- Members can read messages from their groups
CREATE POLICY "members_can_read_messages"
ON group_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.user_id = auth.uid()
      AND group_members.group_id = group_messages.group_id
  )
);

-- Members can send messages to their groups
CREATE POLICY "members_can_send_messages"
ON group_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.user_id = auth.uid()
      AND group_members.group_id = group_messages.group_id
  )
);

-- Users can delete their own messages
CREATE POLICY "users_can_delete_own_messages"
ON group_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Fix groups RLS
DROP POLICY IF EXISTS "public_groups_readable" ON groups;
DROP POLICY IF EXISTS "authenticated can read groups" ON groups;
DROP POLICY IF EXISTS "authenticated_can_read_all_groups" ON groups;
-- Drop all possible existing policies for groups insert and update
DROP POLICY IF EXISTS "authenticated_can_create_groups" ON groups;
DROP POLICY IF EXISTS "creators_can_update_groups" ON groups;

-- All authenticated users can read all groups
CREATE POLICY "authenticated_can_read_all_groups"
ON groups FOR SELECT
TO authenticated
USING (true);

-- Removed IF NOT EXISTS - not supported in PostgreSQL
-- Only authenticated users can create groups (handled by create_group_with_creator function)
CREATE POLICY "authenticated_can_create_groups"
ON groups FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Creators can update their groups
CREATE POLICY "creators_can_update_groups"
ON groups FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- 5. Ensure expires_at column exists on group_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_messages' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE group_messages ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- 6. Create trigger to set expires_at on insert if it doesn't exist
DROP TRIGGER IF EXISTS set_message_expiry ON group_messages;
DROP FUNCTION IF EXISTS set_message_expiry();

CREATE OR REPLACE FUNCTION set_message_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + interval '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_message_expiry
  BEFORE INSERT ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_message_expiry();

-- 7. Add index for faster message queries
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_expires_at ON group_messages(expires_at) WHERE expires_at IS NOT NULL;
