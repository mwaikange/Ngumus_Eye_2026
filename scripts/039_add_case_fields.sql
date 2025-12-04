-- Add missing columns to cases table to match frontend form

-- Add police CR number field
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS police_cr_number TEXT;

-- Add vehicle number plate field
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS vehicle_number_plate TEXT;

-- Add serial numbers field (for stolen devices/items)
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS serial_numbers TEXT[];

-- Add stolen item reference field
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS stolen_item_reference TEXT;

-- Add category field
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add case_number field (visible to users, different from serial_number)
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS case_number TEXT;

-- Create index on case_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);

-- Create index on police_cr_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_cases_police_cr_number ON cases(police_cr_number);

-- Add comment
COMMENT ON COLUMN cases.police_cr_number IS 'Police Case Reference Number';
COMMENT ON COLUMN cases.vehicle_number_plate IS 'Vehicle registration number if applicable';
COMMENT ON COLUMN cases.serial_numbers IS 'Array of serial numbers for stolen devices/items';
COMMENT ON COLUMN cases.stolen_item_reference IS 'Reference for stolen items (IMEI, asset tag, etc)';
COMMENT ON COLUMN cases.category IS 'Case category (theft, gbv, harassment, etc)';
COMMENT ON COLUMN cases.case_number IS 'User-visible case number (e.g., CASE-2025-000001)';
