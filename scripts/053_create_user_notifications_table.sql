-- Script 053: Create user_notifications table for user-specific notifications

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow', 'group_request', 'subscription', 'system')),
  title TEXT,
  message TEXT NOT NULL,
  entity_id UUID, -- follower_id, group_id, etc.
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(user_id, read_at) WHERE read_at IS NULL;

-- RLS: Users can only see their own notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_notifications" ON user_notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_update_own_notifications" ON user_notifications
FOR UPDATE USING (user_id = auth.uid());

-- Function to create follow notification
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notifications (user_id, type, title, message, entity_id)
  VALUES (
    NEW.following_id,
    'follow',
    'New Follower',
    (SELECT display_name FROM profiles WHERE id = NEW.follower_id) || ' started following you',
    NEW.follower_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_follow_notification ON user_follows;
CREATE TRIGGER trigger_follow_notification
AFTER INSERT ON user_follows
FOR EACH ROW EXECUTE FUNCTION create_follow_notification();

-- Function to create group request notification
CREATE OR REPLACE FUNCTION create_group_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_group_creator UUID;
  v_requester_name TEXT;
  v_group_name TEXT;
BEGIN
  -- Get group creator
  SELECT created_by, name INTO v_group_creator, v_group_name
  FROM groups WHERE id = NEW.group_id;

  -- Get requester name
  SELECT display_name INTO v_requester_name
  FROM profiles WHERE id = NEW.user_id;

  -- Notify creator
  INSERT INTO user_notifications (user_id, type, title, message, entity_id)
  VALUES (
    v_group_creator,
    'group_request',
    'New Group Request',
    v_requester_name || ' requested to join ' || v_group_name,
    NEW.group_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_group_request_notification ON group_requests;
CREATE TRIGGER trigger_group_request_notification
AFTER INSERT ON group_requests
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION create_group_request_notification();

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Script 053 completed: User notifications table created with triggers';
END $$;
