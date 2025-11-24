-- ============================================================================
-- DIAGNOSTIC SCRIPT - Run this first to understand current state
-- ============================================================================

-- Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('groups', 'group_members', 'comments', 'reactions')
ORDER BY tablename;

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as "Operation",
  qual as "USING clause",
  with_check as "WITH CHECK clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('groups', 'group_members', 'comments', 'reactions')
ORDER BY tablename, cmd;

-- Check for triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('groups', 'group_members', 'comments', 'reactions')
ORDER BY event_object_table;

-- ============================================================================
-- FIX: DROP ALL PROBLEMATIC POLICIES
-- ============================================================================

-- Drop all existing groups policies
DROP POLICY IF EXISTS "groups_select_public_or_member" ON groups;
DROP POLICY IF EXISTS "groups_select_public_or_own" ON groups;
DROP POLICY IF EXISTS "Users can view public groups or own groups" ON groups;
DROP POLICY IF EXISTS "Users can view public groups or groups they are members of" ON groups;
DROP POLICY IF EXISTS "Users can view groups" ON groups;
DROP POLICY IF EXISTS "groups_insert_authenticated" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "groups_update_owner" ON groups;
DROP POLICY IF EXISTS "Creators can update own groups" ON groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON groups;
DROP POLICY IF EXISTS "Creators can delete own groups" ON groups;

-- Drop all existing group_members policies
DROP POLICY IF EXISTS "group_members_select_if_group_visible" ON group_members;
DROP POLICY IF EXISTS "Users can view all group members" ON group_members;
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_owner_or_self" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON group_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups or admins can remove" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;

-- Drop all existing comments policies
DROP POLICY IF EXISTS "comments_select_if_incident_visible" ON comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
DROP POLICY IF EXISTS "comments_insert_own" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "comments_update_own" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "comments_delete_own" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

-- Drop all existing reactions policies
DROP POLICY IF EXISTS "reactions_select_all" ON reactions;
DROP POLICY IF EXISTS "reactions_insert_own" ON reactions;
DROP POLICY IF EXISTS "reactions_delete_own" ON reactions;

-- ============================================================================
-- CREATE SIMPLE, NON-CIRCULAR RLS POLICIES
-- ============================================================================

-- GROUPS: Allow authenticated users to read all public groups and their own
CREATE POLICY "Read all groups"
  ON groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Create own groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update own groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Delete own groups"
  ON groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- GROUP_MEMBERS: Simple policies without circular checks
CREATE POLICY "Read all group members"
  ON group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Join groups"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update member roles as admin"
  ON group_members FOR UPDATE
  TO authenticated
  USING (
    -- Check if current user is owner/moderator of this group
    auth.uid() IN (
      SELECT user_id FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Leave or remove members"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    -- Can delete if you are the member or an admin
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT user_id FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.role IN ('owner', 'moderator')
    )
  );

-- COMMENTS: Simple policies for authenticated users
CREATE POLICY "Read all comments"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Create own comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author);

CREATE POLICY "Update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author);

CREATE POLICY "Delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author);

-- REACTIONS: Simple policies
CREATE POLICY "Read all reactions"
  ON reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Create own reactions"
  ON reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own reactions"
  ON reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFY POLICIES WORK
-- ============================================================================

-- Test query that should now work
SELECT 
  g.id,
  g.name,
  g.visibility,
  g.member_count,
  g.created_at
FROM groups g
ORDER BY g.created_at DESC
LIMIT 5;

-- Test group members query
SELECT 
  gm.group_id,
  gm.user_id,
  gm.role,
  gm.joined_at
FROM group_members gm
ORDER BY gm.joined_at DESC
LIMIT 5;
