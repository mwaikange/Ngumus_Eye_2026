-- Create cases (case desk) table with all required fields
-- Created new cases table since it doesn't exist

CREATE TABLE IF NOT EXISTS public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  serial_number text unique not null,
  incident_id uuid references public.incidents(id),
  title text not null,
  description text,
  status text check (status in ('open','in_progress','resolved','closed')) default 'open',
  priority text check (priority in ('low','medium','high','urgent')) default 'medium',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Case files table for document attachments
CREATE TABLE IF NOT EXISTS public.case_files (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_type text not null,
  file_size bigint,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_serial_number ON public.cases(serial_number);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);
CREATE INDEX IF NOT EXISTS idx_case_files_case_id ON public.case_files(case_id);

-- RLS Policies
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_files ENABLE ROW LEVEL SECURITY;

-- Users can view their own cases
CREATE POLICY "Users can view own cases"
  ON public.cases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own cases
CREATE POLICY "Users can create own cases"
  ON public.cases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own cases
CREATE POLICY "Users can update own cases"
  ON public.cases
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can view their own case files
CREATE POLICY "Users can view own case files"
  ON public.case_files
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_files.case_id 
    AND cases.user_id = auth.uid()
  ));

-- Users can upload files to their own cases
CREATE POLICY "Users can upload to own cases"
  ON public.case_files
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_files.case_id 
    AND cases.user_id = auth.uid()
  ));

-- Function to generate serial numbers
CREATE OR REPLACE FUNCTION generate_case_serial_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number int;
  serial_num text;
BEGIN
  -- Get the next number based on count
  SELECT COUNT(*) + 1 INTO next_number FROM public.cases;
  
  -- Format as CASE-YYYY-NNNNNN
  serial_num := 'CASE-' || to_char(now(), 'YYYY') || '-' || lpad(next_number::text, 6, '0');
  
  RETURN serial_num;
END;
$$;

-- Trigger to auto-generate serial numbers
CREATE OR REPLACE FUNCTION set_case_serial_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_case_serial_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_case_serial_number
  BEFORE INSERT ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION set_case_serial_number();
