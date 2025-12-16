-- Script 052: Comprehensive fix for groups functionality

-- ====================================
-- 1. ADD is_public FIELD TO GROUPS
-- ====================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'groups' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE groups ADD COLUMN is_public BOOLEAN DEFAULT true;
    COMMENT ON COLUMN groups.is_public IS 'True = instant join, False = approval required';
  END IF;
END $$;

-- Migrate visibility to is_public
UPDATE groups SET is_public = (visibility = 'public') WHERE is_public IS NULL;

-- ====================================
-- 2. ENSURE group_members HAS status COLUMN
-- ====================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'group_members' AND column_name = 'status'
  ) THEN
    ALTER TABLE group_members ADD COLUMN status TEXT DEFAULT 'approved';
  END IF;
END $$;

-- ====================================
-- 3. FIX MEMBER COUNT TO COUNT ONLY APPROVED
-- ====================================
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE groups
    SET member_count = (
      SELECT COUNT(*)
      FROM group_members
      WHERE group_id = NEW.group_id
      AND status = 'approved'
    )
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups
    SET member_count = (
      SELECT COUNT(*)
      FROM group_members
      WHERE group_id = OLD.group_id
      AND status = 'approved'
    )
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_member_count_trigger ON group_members;
CREATE TRIGGER update_member_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON group_members
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- ====================================
-- 4. CREATE SAFE JOIN FUNCTION (AVOIDS RLS RECURSION)
-- ====================================
CREATE OR REPLACE FUNCTION join_group_safe(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_is_public BOOLEAN;
  v_existing_member UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Check if group exists and get is_public
  SELECT is_public INTO v_is_public
  FROM groups
  WHERE id = p_group_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Group not found');
  END IF;

  -- Check if already a member
  SELECT user_id INTO v_existing_member
  FROM group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object('error', 'You are already a member of this group');
  END IF;

  -- Insert with appropriate status
  IF v_is_public THEN
    INSERT INTO group_members (group_id, user_id, role, status, approved_at, approved_by)
    VALUES (p_group_id, v_user_id, 'member', 'approved', NOW(), (SELECT created_by FROM groups WHERE id = p_group_id));
    
    RETURN jsonb_build_object('success', true, 'message', 'Successfully joined group!');
  ELSE
    -- Private group - create request instead
    INSERT INTO group_requests (group_id, user_id, status)
    VALUES (p_group_id, v_user_id, 'pending')
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    RETURN jsonb_build_object('success', true, 'message', 'Membership request sent');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- 5. SIMPLIFY RLS POLICIES
-- ====================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "members_can_read_messages" ON group_messages;
DROP POLICY IF EXISTS "members_can_send_messages" ON group_messages;
DROP POLICY IF EXISTS "members_read_group_messages" ON group_messages;
DROP POLICY IF EXISTS "members_insert_group_messages" ON group_messages;

-- Create simple, non-recursive policies
CREATE POLICY "approved_members_read_messages" ON group_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_messages.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.status = 'approved'
  )
);

CREATE POLICY "approved_members_send_messages" ON group_messages
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_messages.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.status = 'approved'
  )
);

-- ====================================
-- 6. ENSURE RLS ON group_members ALLOWS READING OWN MEMBERSHIP
-- ====================================
DROP POLICY IF EXISTS "authenticated_read_members" ON group_members;

CREATE POLICY "users_read_own_and_approved_memberships" ON group_members
FOR SELECT USING (
  user_id = auth.uid()
  OR status = 'approved'
);

-- ====================================
-- 7. LOG SUCCESS
-- ====================================
DO $$
BEGIN
  RAISE NOTICE 'Script 052 completed: Groups comprehensively fixed';
END $$;
