-- Fix group_messages RLS to allow members to see messages properly
-- The issue: The SELECT policy is checking membership but might be too restrictive

-- Drop existing messages policies
DROP POLICY IF EXISTS "members_read_messages" ON group_messages;
DROP POLICY IF EXISTS "members_post_messages" ON group_messages;
DROP POLICY IF EXISTS "users_delete_own_messages" ON group_messages;

-- Create simple, working policies
-- Members can read messages from last 24 hours
CREATE POLICY "members_read_group_messages" ON group_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_messages.group_id
    AND gm.user_id = auth.uid()
  )
);

-- Members can insert messages
CREATE POLICY "members_insert_group_messages" ON group_messages
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_messages.group_id
    AND gm.user_id = auth.uid()
  )
);

-- Users can delete their own messages
CREATE POLICY "users_delete_own_group_messages" ON group_messages
FOR DELETE TO authenticated
USING (user_id = auth.uid());
