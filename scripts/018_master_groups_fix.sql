-- ============================================================================
-- MASTER FIX: Clean up all RLS policies and fix group membership issues
-- ============================================================================
-- This migration fixes:
-- 1. 13 duplicate policies on group_members causing conflicts
-- 2. 9 duplicate policies on groups
-- 3. Circular dependencies between tables
-- 4. Duplicate triggers causing race conditions
-- 5. 409/400/500 errors on group operations
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL existing RLS policies to start fresh
-- ============================================================================

-- Drop all group_members policies (13 duplicates)
DROP POLICY IF EXISTS "Join groups" ON group_members;
DROP POLICY IF EXISTS "authenticated_can_join_groups" ON group_members;
DROP POLICY IF EXISTS "self insert memberships" ON group_members;
DROP POLICY IF EXISTS "users can join groups" ON group_members;
DROP POLICY IF EXISTS "Read all group members" ON group_members;
DROP POLICY IF EXISTS "authenticated_can_read_members" ON group_members;
DROP POLICY IF EXISTS "self read memberships" ON group_members;
DROP POLICY IF EXISTS "users can view all group memberships" ON group_members;
DROP POLICY IF EXISTS "group_members_select_public_groups_or_member" ON group_members;
DROP POLICY IF EXISTS "Leave groups" ON group_members;
DROP POLICY IF EXISTS "users can leave groups" ON group_members;
DROP POLICY IF EXISTS "authenticated_leave_groups" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_self" ON group_members;

-- Drop all groups policies (9 duplicates)
DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON groups;
DROP POLICY IF EXISTS "authenticated_can_read_groups" ON groups;
DROP POLICY IF EXISTS "users can view all groups" ON groups;
DROP POLICY IF EXISTS "groups_select_public_or_member" ON groups;
DROP POLICY IF EXISTS "Everyone can view groups" ON groups;
DROP POLICY IF EXISTS "Anyone can view public groups" ON groups;
DROP POLICY IF EXISTS "Creators can create groups" ON groups;
DROP POLICY IF EXISTS "authenticated_can_create_groups" ON groups;
DROP POLICY IF EXISTS "groups_insert_authenticated" ON groups;

-- Drop all group_messages policies
DROP POLICY IF EXISTS "Members can read messages" ON group_messages;
DROP POLICY IF EXISTS "members_read_messages" ON group_messages;
DROP POLICY IF EXISTS "Members can post messages" ON group_messages;
DROP POLICY IF EXISTS "members_post_messages" ON group_messages;
DROP POLICY IF EXISTS "group_messages_select_member" ON group_messages;
DROP POLICY IF EXISTS "group_messages_insert_member" ON group_messages;

-- Drop all profiles policies (to recreate clean)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "public_read_profiles" ON profiles;

-- ============================================================================
-- STEP 2: Drop duplicate triggers
-- ============================================================================

-- Keep only trigger_update_group_member_count, drop the duplicate
DROP TRIGGER IF EXISTS trigger_update_member_count ON group_members;

-- ============================================================================
-- STEP 3: Create clean, minimal, non-conflicting RLS policies
-- ============================================================================

-- GROUPS: Simple public read for all authenticated users
CREATE POLICY "anyone_can_read_groups" ON groups
FOR SELECT TO authenticated
USING (true);

-- GROUPS: Authenticated users can create groups
CREATE POLICY "authenticated_can_create_groups" ON groups
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- GROUPS: Creators can update their groups
CREATE POLICY "creators_update_groups" ON groups
FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- GROUP_MEMBERS: All authenticated users can read all memberships
CREATE POLICY "authenticated_read_members" ON group_members
FOR SELECT TO authenticated
USING (true);

-- GROUP_MEMBERS: Users can join groups (insert self)
CREATE POLICY "authenticated_join_groups" ON group_members
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- GROUP_MEMBERS: Users can leave groups they're in
CREATE POLICY "users_leave_groups" ON group_members
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- GROUP_MESSAGES: Only members can read messages
CREATE POLICY "members_read_messages" ON group_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_messages.group_id
    AND group_members.user_id = auth.uid()
  )
  AND created_at > (now() - interval '24 hours')
);

-- GROUP_MESSAGES: Only members can post messages
CREATE POLICY "members_post_messages" ON group_messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_messages.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- GROUP_MESSAGES: Users can delete their own messages
CREATE POLICY "users_delete_own_messages" ON group_messages
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- PROFILES: Public read for joins to work
CREATE POLICY "public_read_profiles" ON profiles
FOR SELECT TO authenticated
USING (true);

-- PROFILES: Users can insert their own profile
CREATE POLICY "users_insert_own_profile" ON profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- PROFILES: Users can update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- STEP 4: Create safe join function with SECURITY DEFINER
-- ============================================================================

CREATE OR REPLACE FUNCTION join_group_safe(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_already_member boolean;
    v_group_exists boolean;
BEGIN
    -- Validate user is authenticated
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Check if group exists
    SELECT EXISTS (
        SELECT 1 FROM groups
        WHERE id = p_group_id
    ) INTO v_group_exists;

    IF NOT v_group_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Group not found'
        );
    END IF;

    -- Check if already a member (bypasses RLS since SECURITY DEFINER)
    SELECT EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = p_group_id 
        AND user_id = v_user_id
    ) INTO v_already_member;

    IF v_already_member THEN
        RETURN jsonb_build_object(
            'success', true,
            'alreadyMember', true,
            'message', 'You are already a member of this group'
        );
    END IF;

    -- Insert membership
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (p_group_id, v_user_id, 'member');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined group'
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', true,
            'alreadyMember', true,
            'message', 'You are already a member of this group'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION join_group_safe(uuid) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration to verify)
-- ============================================================================

-- Verify only one policy per operation
-- SELECT tablename, cmd, COUNT(*) as policy_count
-- FROM pg_policies  
-- WHERE tablename IN ('groups', 'group_members', 'group_messages', 'profiles')
-- GROUP BY tablename, cmd
-- ORDER BY tablename, cmd;

-- Verify no duplicate triggers
-- SELECT event_object_table, trigger_name, event_manipulation
-- FROM information_schema.triggers
-- WHERE event_object_table = 'group_members'
-- ORDER BY trigger_name;
