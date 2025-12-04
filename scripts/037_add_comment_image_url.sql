-- Add image_url column to comments table for comment image attachments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_image_url ON comments(image_url) WHERE image_url IS NOT NULL;
