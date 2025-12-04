-- Update case_files schema (runs after cases table is created)
-- Split from original script 030 to run after table creation

-- Add constraints for file types (PDFs, images, documents)
ALTER TABLE public.case_files
ADD CONSTRAINT valid_file_type 
CHECK (file_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 
                     'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                     'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));

-- Add file size limit (50MB)
ALTER TABLE public.case_files
ADD CONSTRAINT valid_file_size
CHECK (file_size <= 52428800);

-- Comment: Maximum of 10 files per case
CREATE OR REPLACE FUNCTION check_case_files_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  file_count int;
BEGIN
  SELECT COUNT(*) INTO file_count 
  FROM public.case_files 
  WHERE case_id = NEW.case_id;
  
  IF file_count >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 files per case exceeded';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_case_files_limit
  BEFORE INSERT ON public.case_files
  FOR EACH ROW
  EXECUTE FUNCTION check_case_files_limit();
