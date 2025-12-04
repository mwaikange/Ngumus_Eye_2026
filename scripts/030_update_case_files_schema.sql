-- Create cases table if it doesn't exist
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Added new fields for case desk functionality
  serial_numbers TEXT[],
  vehicle_number_plate TEXT,
  police_cr_number TEXT,
  stolen_item_reference TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create case_documents table for PDFs, Word docs, etc.
CREATE TABLE IF NOT EXISTS case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);

-- Enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for cases
CREATE POLICY "Users can view their own cases"
  ON cases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own cases"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own cases"
  ON cases FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS policies for case_documents
CREATE POLICY "Users can view their own case documents"
  ON case_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own case documents"
  ON case_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own case documents"
  ON case_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_id AND user_id = auth.uid()
    )
  );
