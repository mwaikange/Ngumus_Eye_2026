-- Ensure incidents table has proper primary key constraint
-- and no duplicate records

-- First, check for and remove any duplicate incidents
DELETE FROM incidents a USING incidents b
WHERE a.id = b.id AND a.ctid < b.ctid;

-- Ensure primary key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'incidents_pkey' AND conrelid = 'incidents'::regclass
  ) THEN
    ALTER TABLE incidents ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Ensure incident_types has proper foreign key
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_type_id_fkey;
ALTER TABLE incidents ADD CONSTRAINT incidents_type_id_fkey 
  FOREIGN KEY (type_id) REFERENCES incident_types(id);

-- Ensure created_by has proper foreign key
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_created_by_fkey;
ALTER TABLE incidents ADD CONSTRAINT incidents_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES profiles(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_incidents_id_type ON incidents(id, type_id);
CREATE INDEX IF NOT EXISTS idx_incidents_id_created_by ON incidents(id, created_by);
