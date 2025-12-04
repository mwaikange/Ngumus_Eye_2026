-- Create group requests table for approval queue
CREATE TABLE IF NOT EXISTS group_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_requests_group_id ON group_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_requests_user_id ON group_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_requests_status ON group_requests(status);

-- Add RLS policies
ALTER TABLE group_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view requests for their groups"
  ON group_requests FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Users can create requests"
  ON group_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Group creators can update requests"
  ON group_requests FOR UPDATE
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    )
  );

-- Create table for group message files
CREATE TABLE IF NOT EXISTS group_message_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'image',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_message_files_message_id ON group_message_files(message_id);

-- Add RLS policies
ALTER TABLE group_message_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view message files"
  ON group_message_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_messages gm
      JOIN group_members gme ON gme.group_id = gm.group_id
      WHERE gm.id = message_id AND gme.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can insert message files"
  ON group_message_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_messages gm
      JOIN group_members gme ON gme.group_id = gm.group_id
      WHERE gm.id = message_id AND gme.user_id = auth.uid() AND gm.user_id = auth.uid()
    )
  );
