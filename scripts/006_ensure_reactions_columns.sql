-- Ensure reactions columns exist on incidents table
-- This adds the columns if they don't already exist

DO $$ 
BEGIN
  -- Add upvotes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'upvotes'
  ) THEN
    ALTER TABLE incidents ADD COLUMN upvotes INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- Add downvotes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'downvotes'
  ) THEN
    ALTER TABLE incidents ADD COLUMN downvotes INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- Add loves column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'loves'
  ) THEN
    ALTER TABLE incidents ADD COLUMN loves INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Ensure reactions table has the correct structure
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('upvote', 'downvote', 'love')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(incident_id, user_id, kind)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reactions_incident ON reactions(incident_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

-- Enable RLS
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reactions
DROP POLICY IF EXISTS "Anyone can view reactions" ON reactions;
CREATE POLICY "Anyone can view reactions" ON reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can add reactions" ON reactions;
CREATE POLICY "Authenticated users can add reactions" ON reactions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own reactions" ON reactions;
CREATE POLICY "Users can remove their own reactions" ON reactions 
  FOR DELETE USING (auth.uid() = user_id);
