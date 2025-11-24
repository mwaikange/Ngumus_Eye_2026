-- Create group messages table for WhatsApp-style chat
CREATE TABLE IF NOT EXISTS group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text,
  image_url text,
  video_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  -- Using regular column instead of GENERATED to avoid immutability error
  expires_at timestamptz,
  CONSTRAINT message_content_check CHECK (
    message IS NOT NULL OR image_url IS NOT NULL OR video_url IS NOT NULL
  )
);

-- Function to set expires_at on insert
CREATE OR REPLACE FUNCTION set_group_message_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.expires_at := NEW.created_at + interval '24 hours';
  RETURN NEW;
END;
$$;

-- Trigger to automatically set expires_at
DROP TRIGGER IF EXISTS trigger_set_message_expiry ON group_messages;
CREATE TRIGGER trigger_set_message_expiry
BEFORE INSERT ON group_messages
FOR EACH ROW
EXECUTE FUNCTION set_group_message_expiry();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_user_id ON group_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_expires_at ON group_messages(expires_at);

-- RLS Policies for group messages
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages from groups they are members of
CREATE POLICY "Members can read group messages"
ON group_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_messages.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Members can post messages to groups they belong to
CREATE POLICY "Members can post to groups"
ON group_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_messages.group_id
    AND group_members.user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON group_messages FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Function to clean up expired messages (run hourly via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_group_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM group_messages
  WHERE expires_at < now();
END;
$$;

-- Add member count column to groups (denormalized for performance)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS member_count integer DEFAULT 0;

-- Function to update member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups
    SET member_count = member_count + 1
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups
    SET member_count = GREATEST(member_count - 1, 0)
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger to automatically update member count
DROP TRIGGER IF EXISTS trigger_update_group_member_count ON group_members;
CREATE TRIGGER trigger_update_group_member_count
AFTER INSERT OR DELETE ON group_members
FOR EACH ROW
EXECUTE FUNCTION update_group_member_count();

-- Initialize member counts for existing groups
UPDATE groups g
SET member_count = (
  SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id
);
