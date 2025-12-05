-- Drop the 3 separate case tables
DROP TABLE IF EXISTS case_files CASCADE;
DROP TABLE IF EXISTS case_documents CASCADE;
DROP TABLE IF EXISTS case_evidence CASCADE;

-- Add JSONB array fields and location/reporter fields to cases table
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS evidence jsonb[] DEFAULT ARRAY[]::jsonb[],
ADD COLUMN IF NOT EXISTS documents jsonb[] DEFAULT ARRAY[]::jsonb[],
ADD COLUMN IF NOT EXISTS files jsonb[] DEFAULT ARRAY[]::jsonb[],
ADD COLUMN IF NOT EXISTS location_lat double precision,
ADD COLUMN IF NOT EXISTS location_lng double precision,
ADD COLUMN IF NOT EXISTS location_address text,
ADD COLUMN IF NOT EXISTS reporter_name text,
ADD COLUMN IF NOT EXISTS reporter_phone text,
ADD COLUMN IF NOT EXISTS reporter_email text;

-- Create storage buckets for case files (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-evidence', 'case-evidence', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('case-documents', 'case-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Update RLS policies for storage buckets
CREATE POLICY "Users can upload case evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'case-evidence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view case evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'case-evidence');

CREATE POLICY "Users can upload case documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'case-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view case documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'case-documents');
