-- Update incident_media table to support video
ALTER TABLE incident_media 
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video'));

-- Add constraint: max 3 images OR 1 video per incident
CREATE OR REPLACE FUNCTION check_incident_media_limit()
RETURNS TRIGGER AS $$
DECLARE
  image_count INTEGER;
  video_count INTEGER;
BEGIN
  -- Count existing media for this incident
  SELECT 
    COUNT(*) FILTER (WHERE media_type = 'image'),
    COUNT(*) FILTER (WHERE media_type = 'video')
  INTO image_count, video_count
  FROM incident_media
  WHERE incident_id = NEW.incident_id;

  -- Check if adding video when images exist
  IF NEW.media_type = 'video' AND image_count > 0 THEN
    RAISE EXCEPTION 'Cannot add video when images already exist';
  END IF;

  -- Check if adding image when video exists
  IF NEW.media_type = 'image' AND video_count > 0 THEN
    RAISE EXCEPTION 'Cannot add images when video already exists';
  END IF;

  -- Check video limit (max 1)
  IF NEW.media_type = 'video' AND video_count >= 1 THEN
    RAISE EXCEPTION 'Maximum 1 video per incident';
  END IF;

  -- Check image limit (max 3)
  IF NEW.media_type = 'image' AND image_count >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 images per incident';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_incident_media_limit
  BEFORE INSERT ON incident_media
  FOR EACH ROW
  EXECUTE FUNCTION check_incident_media_limit();
