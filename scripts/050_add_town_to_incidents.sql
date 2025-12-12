-- Add town column to incidents table
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS town TEXT;

-- Add comment for documentation
COMMENT ON COLUMN incidents.town IS 'Nearest town or city to the incident location';

-- Create index for faster town-based queries
CREATE INDEX IF NOT EXISTS idx_incidents_town ON incidents(town);
