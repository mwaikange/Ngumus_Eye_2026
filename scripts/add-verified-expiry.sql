-- Add verified_expiry column to incidents
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS verified_expiry TIMESTAMP WITH TIME ZONE;

-- Trigger function: set verified_expiry = created_at + 48h when admin_verified flips to TRUE
CREATE OR REPLACE FUNCTION set_verified_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set it once — if already set, don't overwrite
  IF NEW.admin_verified = TRUE AND OLD.admin_verified = FALSE AND NEW.verified_expiry IS NULL THEN
    NEW.verified_expiry := NEW.created_at + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_verified_expiry ON incidents;
CREATE TRIGGER trg_set_verified_expiry
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION set_verified_expiry();

-- Back-fill: set verified_expiry for already admin_verified incidents that don't have it yet
UPDATE incidents
SET verified_expiry = created_at + INTERVAL '48 hours'
WHERE admin_verified = TRUE
  AND verified_expiry IS NULL;
