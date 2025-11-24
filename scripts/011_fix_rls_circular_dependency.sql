-- Fix RLS policies to eliminate infinite recursion and allow proper access

-- ============================================================================
-- FIX COMMENTS TABLE RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

-- Recreate with proper permissions
CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = author);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = author);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = author);

-- ============================================================================
-- FIX GROUPS TABLE RLS - Remove circular dependency
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view public groups or groups they are members of" ON groups;
DROP POLICY IF EXISTS "Users can view groups" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON groups;

-- Recreate without checking group_members (which causes recursion)
CREATE POLICY "Users can view public groups or own groups"
  ON groups FOR SELECT
  USING (
    visibility = 'public' OR 
    created_by = auth.uid()
  );

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update own groups"
  ON groups FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete own groups"
  ON groups FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================================================
-- FIX GROUP_MEMBERS TABLE RLS - Remove circular dependency
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;

-- Recreate without checking groups table (which causes recursion)
CREATE POLICY "Users can view all group members"
  ON group_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update member roles"
  ON group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Users can leave groups or admins can remove"
  ON group_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'moderator')
    )
  );

-- ============================================================================
-- ADD FUNCTION TO HANDLE GROUP CREATION WITH MEMBER
-- ============================================================================

-- Function to create group and automatically add creator as owner
CREATE OR REPLACE FUNCTION create_group_with_creator(
  p_name TEXT,
  p_geohash_prefix TEXT,
  p_visibility TEXT
)
RETURNS TABLE(id UUID, name TEXT, geohash_prefix TEXT, visibility TEXT, created_by UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert group
  INSERT INTO groups (name, geohash_prefix, visibility, created_by)
  VALUES (p_name, p_geohash_prefix, p_visibility, v_user_id)
  RETURNING groups.id INTO v_group_id;

  -- Add creator as owner member
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'owner');

  -- Return the created group
  RETURN QUERY
  SELECT g.id, g.name, g.geohash_prefix, g.visibility, g.created_by, g.created_at
  FROM groups g
  WHERE g.id = v_group_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_group_with_creator TO authenticated;
