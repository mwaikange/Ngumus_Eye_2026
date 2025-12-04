-- Create table for comment images
-- Fixed table reference from incident_comments to comments
CREATE TABLE IF NOT EXISTS comment_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'image',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_files_comment_id ON comment_files(comment_id);

-- Add RLS policies
ALTER TABLE comment_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment files"
  ON comment_files FOR SELECT
  TO authenticated, anon
  USING (true);

-- Fixed reference to comments table and author column
CREATE POLICY "Users can insert their own comment files"
  ON comment_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM comments
      WHERE id = comment_id AND author = auth.uid()
    )
  );
