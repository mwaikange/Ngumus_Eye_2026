-- Fix the unique constraint issue on incident_files.case_number
-- The trigger should auto-generate unique case numbers, but the constraint was too strict

-- Drop the UNIQUE constraint on case_number
ALTER TABLE public.incident_files 
DROP CONSTRAINT IF EXISTS incident_files_case_number_key;

-- Add a non-unique index instead for faster lookups
CREATE INDEX IF NOT EXISTS idx_incident_files_case_number_lookup 
ON public.incident_files(case_number);

-- Ensure the case number generation function works correctly
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS text AS $$
DECLARE
  year_code text;
  sequence_num int;
  case_num text;
BEGIN
  year_code := TO_CHAR(NOW(), 'YY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM 9) AS int)), 0) + 1
  INTO sequence_num
  FROM public.incident_files
  WHERE case_number LIKE 'CASE-' || year_code || '-%';
  
  case_num := 'CASE-' || year_code || '-' || LPAD(sequence_num::text, 6, '0');
  RETURN case_num;
END;
$$ LANGUAGE plpgsql;
