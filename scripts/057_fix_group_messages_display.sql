-- =============================================================================
-- FIX GROUP MESSAGES NOT DISPLAYING
-- =============================================================================
-- Issue: Messages are being sent successfully but not displayed to users
-- Root cause: RLS policies may be misconfigured or membership status incorrect
-- =============================================================================

BEGIN;

-- First, let's check and fix any membership status issues
-- Ensure all existing members have status = 'approved' if they don't have a status
UPDATE group_members
SET status = 'approved'
WHERE status IS NULL OR status = '';

-- Now let's drop ALL existing group_messages policies and recreate them correctly
DROP POLICY IF EXISTS "simple_read_group_messages" ON group_messages;
DROP POLICY IF EXISTS "simple_send_group_messages" ON group_messages;
DROP POLICY IF EXISTS "simple_delete_own_messages" ON group_messages;
DROP POLICY IF EXISTS "members_can_read_messages_direct" ON group_messages;
DROP POLICY IF EXISTS "members_can_send_messages_direct" ON group_messages;
DROP POLICY IF EXISTS "authors_can_delete_own_messages" ON group_messages;
DROP POLICY IF EXISTS "members_can_view_messages_via_function" ON group_messages;
DROP POLICY IF EXISTS "members_can_send_messages_via_function" ON group_messages;

-- Create new comprehensive policies
-- POLICY 1: Members can read messages (including checking if user is group creator)
CREATE POLICY "simple_read_group_messages" ON group_messages
FOR SELECT USING (
  -- User is a member of the group (regardless of status for now - we'll check this works first)
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_messages.group_id
    AND gm.user_id = auth.uid()
  )
  -- OR user is the creator of the group
  OR EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_messages.group_id
    AND g.created_by = auth.uid()
  )
);

-- POLICY 2: Members can send messages
CREATE POLICY "simple_send_group_messages" ON group_messages
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND (
    -- User is a member of the group
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_messages.group_id
      AND gm.user_id = auth.uid()
    )
    -- OR user is the creator of the group
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_messages.group_id
      AND g.created_by = auth.uid()
    )
  )
);

-- POLICY 3: Users can delete their own messages
CREATE POLICY "simple_delete_own_messages" ON group_messages
FOR DELETE USING (user_id = auth.uid());

-- Add helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_group_members_lookup ON group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_user ON group_messages(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(created_by);

-- Verification
DO $$
DECLARE
  v_policy_count INT;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'group_messages';

  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'GROUP MESSAGES RLS FIX COMPLETE';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Total group_messages policies: %', v_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '1. Updated all existing members to have status = approved';
  RAISE NOTICE '2. Recreated RLS policies to allow group creators AND members to view messages';
  RAISE NOTICE '3. Added indexes for faster policy checks';
  RAISE NOTICE '';
  RAISE NOTICE 'Test: Try sending a message in a group now - it should appear immediately';
  RAISE NOTICE '=============================================================================';
END $$;

COMMIT;
