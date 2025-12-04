-- Add ad view tracking table
CREATE TABLE IF NOT EXISTS ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ad_inventory(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_views_ad_id ON ad_views(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_user_id ON ad_views(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_viewed_at ON ad_views(viewed_at);

-- Add RLS policies
ALTER TABLE ad_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ad views"
  ON ad_views FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can view their own ad views"
  ON ad_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create aggregated view for ad stats
CREATE OR REPLACE VIEW ad_view_stats AS
SELECT 
  ad_id,
  COUNT(*) as total_views,
  COUNT(DISTINCT user_id) as unique_viewers,
  MAX(viewed_at) as last_viewed_at
FROM ad_views
GROUP BY ad_id;
