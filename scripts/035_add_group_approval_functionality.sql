-- Add approval queue functionality to groups
-- Allows group admins to approve/reject join requests

-- Corrected table name from group_memberships to group_members
ALTER TABLE public.group_members
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('active', 'pending', 'rejected')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS requested_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id);

-- Create function to handle join requests
CREATE OR REPLACE FUNCTION request_group_join(group_id_param uuid, user_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  group_requires_approval boolean;
BEGIN
  -- Check if group requires approval
  SELECT requires_approval INTO group_requires_approval
  FROM groups
  WHERE id = group_id_param;

  IF group_requires_approval THEN
    -- Updated to use group_members table
    INSERT INTO group_members (group_id, user_id, status)
    VALUES (group_id_param, user_id_param, 'pending')
    RETURNING jsonb_build_object('status', 'pending', 'message', 'Join request sent') INTO result;
  ELSE
    -- Auto-approve
    INSERT INTO group_members (group_id, user_id, status, approved_at)
    VALUES (group_id_param, user_id_param, 'active', now())
    RETURNING jsonb_build_object('status', 'active', 'message', 'Joined successfully') INTO result;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve/reject join requests
CREATE OR REPLACE FUNCTION handle_join_request(
  membership_id_param uuid,
  action_param text,
  admin_id_param uuid
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  is_admin boolean;
  group_id_val uuid;
BEGIN
  -- Updated to use group_members table
  SELECT group_id INTO group_id_val
  FROM group_members
  WHERE group_id = membership_id_param AND user_id = (SELECT user_id FROM group_members WHERE group_id = membership_id_param LIMIT 1);

  -- Check if user is admin (checking role column)
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = group_id_val
    AND user_id = admin_id_param
    AND role IN ('moderator', 'owner')
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  IF action_param = 'approve' THEN
    UPDATE group_members
    SET status = 'active',
        approved_at = now(),
        approved_by = admin_id_param
    WHERE group_id = membership_id_param;
    
    result := jsonb_build_object('status', 'approved', 'message', 'Member approved');
  ELSIF action_param = 'reject' THEN
    DELETE FROM group_members WHERE group_id = membership_id_param;
    result := jsonb_build_object('status', 'rejected', 'message', 'Request rejected');
  ELSE
    result := jsonb_build_object('error', 'Invalid action');
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated RLS policy to use group_members table
DROP POLICY IF EXISTS "Members can view group memberships" ON public.group_members;
CREATE POLICY "Members can view group memberships" ON public.group_members
  FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );
