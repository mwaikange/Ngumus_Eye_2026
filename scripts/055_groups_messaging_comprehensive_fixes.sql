-- =============================================================================
-- GROUPS & MESSAGING CRITICAL FIXES - EXECUTE THIS ENTIRE SCRIPT
-- =============================================================================
-- This script fixes the 4 critical issues after the RLS overhaul:
-- 1. Public group immediate access
-- 2. Message sending failures (403 errors)
-- 3. Private group request approval failures
-- 4. Notification display names missing
-- =============================================================================

BEGIN;

-- =============================================================================
-- FIX 1: GRANT PERMISSIONS TO RPC FUNCTIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION request_join_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_group_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_group_member(UUID, UUID) TO authenticated;

-- Fix the is_group_member function to use proper search path
ALTER FUNCTION is_group_member(UUID, UUID) SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- FIX 2: IMPROVE MESSAGE SENDING POLICIES (NO MORE 403 ERRORS)
-- =============================================================================

-- Drop the old policies that use the function
DROP POLICY IF EXISTS "members_can_view_messages_via_function" ON group_messages;
DROP POLICY IF EXISTS "members_can_send_messages_via_function" ON group_messages;

-- Create new policies with direct EXISTS checks (more reliable)
CREATE POLICY "members_can_read_messages_direct" ON group_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_messages.group_id
    AND gm.user_id = auth.uid()
    AND gm.status = 'approved'
  )
);

CREATE POLICY "members_can_send_messages_direct" ON group_messages
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_messages.group_id
    AND gm.user_id = auth.uid()
    AND gm.status = 'approved'
  )
);

-- Keep the delete policy
DROP POLICY IF EXISTS "authors_can_delete_own_messages" ON group_messages;
CREATE POLICY "authors_can_delete_own_messages" ON group_messages
FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- FIX 3: IMPROVE GROUP MEMBERS VISIBILITY
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "anyone_can_view_approved_members" ON group_members;
DROP POLICY IF EXISTS "users_can_view_own_membership" ON group_members;

-- Create comprehensive read policy
CREATE POLICY "users_can_view_memberships" ON group_members
FOR SELECT USING (
  -- Can see own membership regardless of status
  user_id = auth.uid()
  -- Can see all approved members
  OR status = 'approved'
  -- Can see all members if you're a member of the group
  OR EXISTS (
    SELECT 1 FROM group_members gm2
    WHERE gm2.group_id = group_members.group_id
    AND gm2.user_id = auth.uid()
    AND gm2.status = 'approved'
  )
);

-- Keep the leave policy
DROP POLICY IF EXISTS "users_can_leave_own_membership" ON group_members;
CREATE POLICY "users_can_leave_own_membership" ON group_members
FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- FIX 4: ENHANCED APPROVE_GROUP_REQUEST FUNCTION WITH BETTER ERROR HANDLING
-- =============================================================================

CREATE OR REPLACE FUNCTION approve_group_request(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_request RECORD;
  v_member_exists BOOLEAN;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated', 
      'code', 'AUTH_REQUIRED'
    );
  END IF;

  -- Get request details with all necessary data
  SELECT 
    gr.id,
    gr.group_id,
    gr.user_id as requester_id,
    gr.status as request_status,
    g.created_by as group_creator,
    g.name as group_name,
    COALESCE(p.display_name, 'Unknown User') as requester_name,
    p.avatar_url as requester_avatar
  INTO v_request
  FROM group_requests gr
  JOIN groups g ON g.id = gr.group_id
  LEFT JOIN profiles p ON p.id = gr.user_id
  WHERE gr.id = p_request_id;

  -- Check if request exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found', 
      'code', 'NOT_FOUND'
    );
  END IF;

  -- Verify user is the group creator
  IF v_request.group_creator != v_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only group creators can approve requests', 
      'code', 'FORBIDDEN'
    );
  END IF;

  -- Check if already approved
  IF v_request.request_status = 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request already approved', 
      'code', 'ALREADY_APPROVED'
    );
  END IF;

  -- Check if user is already a member (edge case)
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_request.group_id
    AND user_id = v_request.requester_id
    AND status = 'approved'
  ) INTO v_member_exists;

  IF v_member_exists THEN
    -- Update request to approved but don't re-add member
    UPDATE group_requests
    SET status = 'approved', updated_at = NOW()
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User is already a member',
      'user_name', v_request.requester_name,
      'group_name', v_request.group_name
    );
  END IF;

  -- Update request status FIRST (prevents duplicate processing)
  UPDATE group_requests
  SET status = 'approved', updated_at = NOW()
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request was already processed or cancelled',
      'code', 'ALREADY_PROCESSED'
    );
  END IF;

  -- Add user as member (with conflict handling)
  INSERT INTO group_members (group_id, user_id, role, status, approved_at, approved_by)
  VALUES (
    v_request.group_id, 
    v_request.requester_id, 
    'member', 
    'approved', 
    NOW(), 
    v_user_id
  )
  ON CONFLICT (group_id, user_id) 
  DO UPDATE SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = v_user_id,
    role = 'member';

  -- Create notification for the requester
  INSERT INTO user_notifications (user_id, type, title, message, entity_id)
  VALUES (
    v_request.requester_id,
    'group_request',
    'Request Approved',
    'You were accepted to join ' || v_request.group_name,
    v_request.group_id
  );

  -- Return success with user details
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Request approved successfully',
    'user_name', v_request.requester_name,
    'user_avatar', v_request.requester_avatar,
    'group_name', v_request.group_name
  );

EXCEPTION 
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is already a member of this group',
      'code', 'DUPLICATE_MEMBER'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM, 
      'code', 'DATABASE_ERROR',
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FIX 5: UPDATE request_join_group TO CREATE NOTIFICATIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION request_join_group(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_is_public BOOLEAN;
  v_group_creator UUID;
  v_group_name TEXT;
  v_user_name TEXT;
  v_existing_member BOOLEAN;
  v_existing_request UUID;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated', 
      'code', 'AUTH_REQUIRED'
    );
  END IF;

  -- Get group details and user name
  SELECT g.is_public, g.created_by, g.name, p.display_name
  INTO v_is_public, v_group_creator, v_group_name, v_user_name
  FROM groups g
  CROSS JOIN profiles p
  WHERE g.id = p_group_id AND p.id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Group not found', 
      'code', 'NOT_FOUND'
    );
  END IF;

  -- Check if already a member
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
    AND user_id = v_user_id
    AND status = 'approved'
  ) INTO v_existing_member;
  
  IF v_existing_member THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are already a member of this group', 
      'code', 'ALREADY_MEMBER',
      'is_member', true
    );
  END IF;

  -- PUBLIC GROUP: Add user as member immediately
  IF v_is_public THEN
    INSERT INTO group_members (group_id, user_id, role, status, approved_at, approved_by)
    VALUES (p_group_id, v_user_id, 'member', 'approved', NOW(), v_group_creator)
    ON CONFLICT (group_id, user_id) 
    DO UPDATE SET status = 'approved', approved_at = NOW();
    
    -- Create notification for group creator
    INSERT INTO user_notifications (user_id, type, title, message, entity_id)
    VALUES (
      v_group_creator,
      'group_joined',
      'New Member',
      v_user_name || ' joined ' || v_group_name,
      p_group_id
    );
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Successfully joined group!',
      'is_member', true,
      'group_name', v_group_name
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
      RETURN jsonb_build_object(
        'success', false,
        'error', 'You already have a pending request', 
        'code', 'REQUEST_EXISTS',
        'request_pending', true
      );
    END IF;
    
    -- Create new request
    INSERT INTO group_requests (group_id, user_id, status)
    VALUES (p_group_id, v_user_id, 'pending')
    ON CONFLICT (group_id, user_id) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
    
    -- Create notification for group creator
    INSERT INTO user_notifications (user_id, type, title, message, entity_id)
    VALUES (
      v_group_creator,
      'group_request',
      'Join Request',
      v_user_name || ' requested to join ' || v_group_name,
      p_group_id
    );
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Membership request sent',
      'is_member', false,
      'request_pending', true,
      'group_name', v_group_name
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM, 
    'code', 'DATABASE_ERROR',
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FIX 6: ENSURE PROFILES TABLE HAS TOWN COLUMN
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'town'
  ) THEN
    ALTER TABLE profiles ADD COLUMN town TEXT;
    RAISE NOTICE 'Added town column to profiles table';
  END IF;
END $$;

-- =============================================================================
-- FIX 7: ADD GROUP REQUEST POLICIES IF MISSING
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "users_create_own_requests" ON group_requests;
DROP POLICY IF EXISTS "users_view_own_requests" ON group_requests;
DROP POLICY IF EXISTS "creators_view_incoming_requests" ON group_requests;

-- Recreate with better logic
CREATE POLICY "users_create_own_requests" ON group_requests
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_view_own_requests" ON group_requests
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "creators_view_group_requests" ON group_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = group_requests.group_id
    AND groups.created_by = auth.uid()
  )
);

CREATE POLICY "creators_update_requests" ON group_requests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = group_requests.group_id
    AND groups.created_by = auth.uid()
  )
);

-- =============================================================================
-- FIX 8: ADD INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON group_members(status);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_requests_user_id ON group_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_requests_group_id ON group_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_requests_status ON group_requests(status);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

DO $$
DECLARE
  v_policies INT;
  v_functions INT;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('group_members', 'group_messages', 'group_requests', 'user_notifications');

  -- Count functions
  SELECT COUNT(*) INTO v_functions
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
  AND p.proname IN ('is_group_member', 'request_join_group', 'approve_group_request');

  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'GROUPS & MESSAGING FIX COMPLETE';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'RLS Policies created: %', v_policies;
  RAISE NOTICE 'RPC Functions created: %', v_functions;
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Update frontend to use rpc() for joining groups';
  RAISE NOTICE '2. Update notification queries to use user_notifications table';
  RAISE NOTICE '3. Test public group join (should be instant)';
  RAISE NOTICE '4. Test message sending (should work without 403 errors)';
  RAISE NOTICE '5. Test private group approval (should show user names)';
  RAISE NOTICE '=============================================================================';
END $$;

COMMIT;
