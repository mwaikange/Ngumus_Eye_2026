-- Create user_follows table for follow functionality
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Enable RLS
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can see their own follows"
  ON user_follows FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can follow others"
  ON user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id AND follower_id != following_id);

CREATE POLICY "Users can unfollow"
  ON user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Add avatar_url to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add follower/following counts view
CREATE OR REPLACE VIEW user_follow_counts AS
SELECT 
  u.id as user_id,
  COALESCE(followers.count, 0) as followers_count,
  COALESCE(following.count, 0) as following_count
FROM auth.users u
LEFT JOIN (
  SELECT following_id, COUNT(*) as count 
  FROM user_follows 
  GROUP BY following_id
) followers ON u.id = followers.following_id
LEFT JOIN (
  SELECT follower_id, COUNT(*) as count 
  FROM user_follows 
  GROUP BY follower_id
) following ON u.id = following.follower_id;
