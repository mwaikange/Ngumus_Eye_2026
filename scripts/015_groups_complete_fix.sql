-- NGUMU'S EYE - Complete Groups System Fix
-- This script implements all requirements from the technical specs

-- ============================================
-- 1. ADD GROUP_MESSAGES TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text,
  image_url text,
  video_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz
);

-- Add trigger to set expires_at on insert
CREATE OR REPLACE FUNCTION set_group_message_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.created_at + interval '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_message_expiry ON group_messages;
CREATE TRIGGER trigger_set_message_expiry
  BEFORE INSERT ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_group_message_expiry();

-- ============================================
-- 2. ADD GROUP_REQUESTS TABLE FOR PRIVATE GROUPS
-- ============================================

CREATE TABLE IF NOT EXISTS group_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_requests_group_id ON group_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_requests_user_id ON group_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_requests_status ON group_requests(status);

-- ============================================
-- 3. ADD MEMBER_COUNT COLUMN TO GROUPS
-- ============================================

ALTER TABLE groups ADD COLUMN IF NOT EXISTS member_count int DEFAULT 0;

-- Function to update member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_member_count ON group_members;
CREATE TRIGGER trigger_update_member_count
  AFTER INSERT OR DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_member_count();

-- Initialize member counts for existing groups
UPDATE groups g
SET member_count = (
  SELECT COUNT(*)
  FROM group_members gm
  WHERE gm.group_id = g.id
);

-- ============================================
-- 4. FIX ALL RLS POLICIES
-- ============================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "public can view public groups" ON groups;
DROP POLICY IF EXISTS "authenticated can create groups" ON groups;
DROP POLICY IF EXISTS "creators can update their groups" ON groups;
DROP POLICY IF EXISTS "creators can delete their groups" ON groups;
DROP POLICY IF EXISTS "members can read own memberships" ON group_members;
DROP POLICY IF EXISTS "users can join groups" ON group_members;
DROP POLICY IF EXISTS "members can leave groups" ON group_members;
DROP POLICY IF EXISTS "members can read messages" ON group_messages;
DROP POLICY IF EXISTS "members can send messages" ON group_messages;
DROP POLICY IF EXISTS "authors can delete own messages" ON group_messages;
DROP POLICY IF EXISTS "users can view own requests" ON group_requests;
DROP POLICY IF EXISTS "creators can view incoming requests" ON group_requests;
DROP POLICY IF EXISTS "users can create requests" ON group_requests;
DROP POLICY IF EXISTS "creators can update requests" ON group_requests;
DROP POLICY IF EXISTS "public profile read for joins" ON profiles;
DROP POLICY IF EXISTS "authenticated users can view public groups or their own" ON groups;
DROP POLICY IF EXISTS "authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "users can view all group memberships" ON group_members;
DROP POLICY IF EXISTS "users can leave groups they are in" ON group_members;
DROP POLICY IF EXISTS "creators can view incoming requests for their groups" ON group_requests;
DROP POLICY IF EXISTS "users can create membership requests" ON group_requests;
DROP POLICY IF EXISTS "creators can update requests for their groups" ON group_requests;

-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES (for joins)
-- ============================================

CREATE POLICY "public profile read for joins"
ON profiles FOR SELECT
USING (true);

-- ============================================
-- GROUPS POLICIES (no circular dependencies)
-- ============================================

CREATE POLICY "authenticated users can view public groups or their own"
ON groups FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (visibility = 'public' OR created_by = auth.uid())
);

CREATE POLICY "authenticated users can create groups"
ON groups FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "creators can update their groups"
ON groups FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "creators can delete their groups"
ON groups FOR DELETE
USING (created_by = auth.uid());

-- ============================================
-- GROUP_MEMBERS POLICIES (no circular dependencies)
-- ============================================

CREATE POLICY "users can view all group memberships"
ON group_members FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "users can join groups"
ON group_members FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "users can leave groups they are in"
ON group_members FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- GROUP_MESSAGES POLICIES
-- ============================================

CREATE POLICY "members can read messages"
ON group_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.user_id = auth.uid()
    AND group_members.group_id = group_messages.group_id
  )
);

CREATE POLICY "members can send messages"
ON group_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.user_id = auth.uid()
    AND group_members.group_id = group_messages.group_id
  )
);

CREATE POLICY "authors can delete own messages"
ON group_messages FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- GROUP_REQUESTS POLICIES
-- ============================================

CREATE POLICY "users can view own requests"
ON group_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "creators can view incoming requests for their groups"
ON group_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = group_requests.group_id
    AND groups.created_by = auth.uid()
  )
);

CREATE POLICY "users can create membership requests"
ON group_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creators can update requests for their groups"
ON group_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = group_requests.group_id
    AND groups.created_by = auth.uid()
  )
);

-- ============================================
-- 5. MESSAGE CLEANUP FUNCTION (24 hour expiry)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM group_messages
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_expires_at ON group_messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_visibility ON groups(visibility);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);

-- ============================================
-- 7. HELPER FUNCTION: CREATE GROUP WITH CREATOR
-- ============================================

-- Drop existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS create_group_with_creator(text, text, text);

CREATE FUNCTION create_group_with_creator(
  p_name text,
  p_geohash_prefix text,
  p_visibility text
) RETURNS uuid AS $$
DECLARE
  v_group_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert group
  INSERT INTO groups (name, geohash_prefix, visibility, created_by)
  VALUES (p_name, p_geohash_prefix, p_visibility, v_user_id)
  RETURNING id INTO v_group_id;

  -- Add creator as owner
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'owner');

  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE 'Groups system setup complete with all RLS policies fixed!';
END $$;
