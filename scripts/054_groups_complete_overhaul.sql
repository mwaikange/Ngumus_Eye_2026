-- =============================================================================
-- CRITICAL OVERHAUL: GROUPS & MESSAGING SYSTEM
-- =============================================================================
-- This script rebuilds the groups architecture from scratch to fix:
-- - RLS recursion (42P17 errors)
-- - Direct client writes being blocked
-- - Public vs Private group logic
-- - Messaging RLS failures
-- - 400/403/409/500 error loops
-- =============================================================================

-- ====================================
-- STEP 1: CLEAN UP OLD PROBLEMATIC POLICIES
-- ====================================

-- Drop ALL existing RLS policies that cause recursion
DROP POLICY IF EXISTS "members_can_read_messages" ON group_messages;
DROP POLICY IF EXISTS "members_can_send_messages" ON group_messages;
DROP POLICY IF EXISTS "members_read_group_messages" ON group_messages;
DROP POLICY IF EXISTS "members_insert_group_messages" ON group_messages;
DROP POLICY IF EXISTS "approved_members_read_messages" ON group_messages;
DROP POLICY IF EXISTS "approved_members_send_messages" ON group_messages;
DROP POLICY IF EXISTS "users_can_delete_own_messages" ON group_messages;
DROP POLICY IF EXISTS "users_delete_own_group_messages" ON group_messages;
DROP POLICY IF EXISTS "authors can delete own messages" ON group_messages;
DROP POLICY IF EXISTS "members can read messages" ON group_messages;
DROP POLICY IF EXISTS "members can send messages" ON group_messages;
DROP POLICY IF EXISTS "Members can read group messages" ON group_messages;
DROP POLICY IF EXISTS "Members can post to groups" ON group_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON group_messages;

DROP POLICY IF EXISTS "authenticated_read_members" ON group_members;
DROP POLICY IF EXISTS "users_read_own_and_approved_memberships" ON group_members;
DROP POLICY IF EXISTS "users_can_leave_groups" ON group_members;
DROP POLICY IF EXISTS "authenticated_join_groups" ON group_members;
DROP POLICY IF EXISTS "users_leave_groups" ON group_members;
DROP POLICY IF EXISTS "admins_can_remove_members" ON group_members;
DROP POLICY IF EXISTS "Members can view group memberships" ON group_members;
DROP POLICY IF EXISTS "users can leave groups they are in" ON group_members;
DROP POLICY IF EXISTS "Update member roles as admin" ON group_members;
DROP POLICY IF EXISTS "Leave or remove members" ON group_members;

-- ====================================
-- STEP 2: CREATE HELPER FUNCTION (NO RLS RECURSION)
-- ====================================

CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM group_members
  WHERE group_id = p_group_id
  AND user_id = p_user_id
  AND status = 'approved';
  
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- STEP 3: CREATE RPC FUNCTION FOR JOINING GROUPS
-- ====================================

CREATE OR REPLACE FUNCTION request_join_group(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_is_public BOOLEAN;
  v_group_creator UUID;
  v_existing_member BOOLEAN;
  v_existing_request UUID;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated', 'code', 'auth_required');
  END IF;

  -- Get group details
  SELECT is_public, created_by INTO v_is_public, v_group_creator
  FROM groups
  WHERE id = p_group_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Group not found', 'code', 'not_found');
  END IF;

  -- Check if already a member using the helper function
  v_existing_member := is_group_member(p_group_id, v_user_id);
  
  IF v_existing_member THEN
    RETURN jsonb_build_object('error', 'You are already a member of this group', 'code', 'already_member');
  END IF;

  -- PUBLIC GROUP: Add user as member immediately
  IF v_is_public THEN
    INSERT INTO group_members (group_id, user_id, role, status, approved_at, approved_by)
    VALUES (p_group_id, v_user_id, 'member', 'approved', NOW(), v_group_creator)
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Successfully joined group!',
      'is_member', true
    );
  
  -- PRIVATE GROUP: Create membership request
  ELSE
    -- Check if already has a pending request
    SELECT id INTO v_existing_request
    FROM group_requests
    WHERE group_id = p_group_id 
    AND user_id = v_user_id 
    AND status = 'pending';
    
    IF v_existing_request IS NOT NULL THEN
      RETURN jsonb_build_object('error', 'You already have a pending request', 'code', 'request_exists');
    END IF;
    
    -- Create new request
    INSERT INTO group_requests (group_id, user_id, status)
    VALUES (p_group_id, v_user_id, 'pending')
    ON CONFLICT (group_id, user_id) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Membership request sent',
      'is_member', false,
      'request_pending', true
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'code', 'database_error');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- STEP 4: CREATE RPC FUNCTION FOR APPROVING REQUESTS
-- ====================================

CREATE OR REPLACE FUNCTION approve_group_request(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_request RECORD;
  v_group_creator UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Get request details
  SELECT gr.*, g.created_by
  INTO v_request
  FROM group_requests gr
  JOIN groups g ON g.id = gr.group_id
  WHERE gr.id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found');
  END IF;

  -- Verify user is the group creator
  IF v_request.created_by != v_user_id THEN
    RETURN jsonb_build_object('error', 'Only group creators can approve requests');
  END IF;

  -- Update request status
  UPDATE group_requests
  SET status = 'approved', updated_at = NOW()
  WHERE id = p_request_id;

  -- Add user as member
  INSERT INTO group_members (group_id, user_id, role, status, approved_at, approved_by)
  VALUES (v_request.group_id, v_request.user_id, 'member', 'approved', NOW(), v_user_id)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'Request approved');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- STEP 5: CREATE RPC FUNCTION FOR REMOVING MEMBERS
-- ====================================

CREATE OR REPLACE FUNCTION remove_group_member(p_group_id UUID, p_user_id_to_remove UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_group_creator UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Get group creator
  SELECT created_by INTO v_group_creator
  FROM groups
  WHERE id = p_group_id;

  -- Only creator can remove members
  IF v_group_creator != v_user_id THEN
    RETURN jsonb_build_object('error', 'Only group creators can remove members');
  END IF;

  -- Cannot remove the creator
  IF p_user_id_to_remove = v_group_creator THEN
    RETURN jsonb_build_object('error', 'Cannot remove the group creator');
  END IF;

  -- Remove member
  DELETE FROM group_members
  WHERE group_id = p_group_id AND user_id = p_user_id_to_remove;

  RETURN jsonb_build_object('success', true, 'message', 'Member removed');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- STEP 6: SIMPLIFIED RLS POLICIES (NO RECURSION)
-- ====================================

-- group_members: Allow reading for visibility, but NO direct writes from client
CREATE POLICY "anyone_can_view_approved_members" ON group_members
FOR SELECT USING (status = 'approved');

CREATE POLICY "users_can_view_own_membership" ON group_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_leave_own_membership" ON group_members
FOR DELETE USING (user_id = auth.uid());

-- group_messages: Use the helper function (no recursion)
CREATE POLICY "members_can_view_messages_via_function" ON group_messages
FOR SELECT USING (
  is_group_member(group_id, auth.uid())
);

CREATE POLICY "members_can_send_messages_via_function" ON group_messages
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND is_group_member(group_id, auth.uid())
);

CREATE POLICY "authors_can_delete_own_messages" ON group_messages
FOR DELETE USING (user_id = auth.uid());

-- group_requests: Standard policies
CREATE POLICY "users_create_own_requests" ON group_requests
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_view_own_requests" ON group_requests
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "creators_view_incoming_requests" ON group_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = group_requests.group_id
    AND groups.created_by = auth.uid()
  )
);

-- ====================================
-- STEP 7: ENSURE group_members HAS UNIQUE CONSTRAINT
-- ====================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'group_members_group_id_user_id_key'
  ) THEN
    ALTER TABLE group_members
    ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);
  END IF;
END $$;

-- ====================================
-- STEP 8: SUCCESS LOG
-- ====================================

DO $$
BEGIN
  RAISE NOTICE '=== GROUPS OVERHAUL COMPLETE ===';
  RAISE NOTICE 'Created RPC functions:';
  RAISE NOTICE '  - is_group_member() - no recursion helper';
  RAISE NOTICE '  - request_join_group() - handles public/private flow';
  RAISE NOTICE '  - approve_group_request() - creator approval';
  RAISE NOTICE '  - remove_group_member() - creator removal';
  RAISE NOTICE 'Simplified RLS policies - no more recursion errors!';
END $$;
