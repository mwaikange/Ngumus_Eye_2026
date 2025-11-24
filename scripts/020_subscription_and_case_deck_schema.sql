-- Subscription System and My Case Deck Schema
-- This script extends the existing schema with new tables for comprehensive case management

-- ============================================
-- SUBSCRIPTION PACKAGES (Extended)
-- ============================================

-- Add more columns to existing plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS duration_type text CHECK (duration_type IN ('month', 'week', 'day')) DEFAULT 'month',
ADD COLUMN IF NOT EXISTS duration_length int DEFAULT 1,
ADD COLUMN IF NOT EXISTS package_type text CHECK (package_type IN ('individual', 'family', 'tourist')) DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb;

-- Insert subscription packages
INSERT INTO public.plans (code, label, price_cents, period_days, duration_type, duration_length, package_type, description, features) VALUES
-- Individual Plans
('individual_monthly', 'Individual Monthly', 7000, 30, 'month', 1, 'individual', 'Perfect for personal safety and security', '["Incident reporting", "Community groups", "Case management", "24/7 support"]'::jsonb),
('individual_3months', 'Individual 3 Months', 19500, 90, 'month', 3, 'individual', 'Save 7% with quarterly plan', '["Incident reporting", "Community groups", "Case management", "24/7 support", "Priority response"]'::jsonb),
('individual_6months', 'Individual 6 Months', 36000, 180, 'month', 6, 'individual', 'Save 14% with semi-annual plan', '["Incident reporting", "Community groups", "Case management", "24/7 support", "Priority response", "Free counseling session"]'::jsonb),
('individual_12months', 'Individual 12 Months', 67200, 365, 'month', 12, 'individual', 'Best value - Save 20% with annual plan', '["Incident reporting", "Community groups", "Case management", "24/7 support", "Priority response", "Free counseling sessions"]'::jsonb),

-- Family Plans
('family_3months', 'Family 3 Months', 15000, 90, 'month', 3, 'family', 'Protect your whole family', '["Up to 5 family members", "All individual features", "Shared incident tracking", "Family counseling"]'::jsonb),
('family_6months', 'Family 6 Months', 45000, 180, 'month', 6, 'family', 'Save with longer term', '["Up to 5 family members", "All individual features", "Shared incident tracking", "Family counseling", "Priority support"]'::jsonb),
('family_12months', 'Family 12 Months', 180000, 365, 'month', 12, 'family', 'Best family protection plan', '["Up to 5 family members", "All individual features", "Shared incident tracking", "Family counseling", "Priority support", "Device tracking"]'::jsonb),

-- Tourist Plans
('tourist_daily', 'Tourist Daily', 10000, 1, 'day', 1, 'tourist', 'Short stay protection', '["Emergency assistance", "Local incident reports", "Tourist support", "24/7 helpline"]'::jsonb),
('tourist_weekly', 'Tourist Weekly', 20000, 7, 'week', 1, 'tourist', 'Week-long coverage', '["Emergency assistance", "Local incident reports", "Tourist support", "24/7 helpline", "Travel advisory"]'::jsonb),
('tourist_7day_special', 'Tourist 7-Day Special', 50000, 7, 'week', 1, 'tourist', 'Special offer for extended stay', '["Emergency assistance", "Local incident reports", "Tourist support", "24/7 helpline", "Travel advisory", "Priority response"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  price_cents = EXCLUDED.price_cents,
  period_days = EXCLUDED.period_days,
  duration_type = EXCLUDED.duration_type,
  duration_length = EXCLUDED.duration_length,
  package_type = EXCLUDED.package_type,
  description = EXCLUDED.description,
  features = EXCLUDED.features;

-- Add columns to user_subscriptions
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('active', 'expired', 'pending', 'cancelled')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ============================================
-- INCIDENT FILES (MY CASE DECK)
-- ============================================

CREATE TABLE IF NOT EXISTS public.incident_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text CHECK (category IN ('theft', 'gbv', 'harassment', 'missing_person', 'fraud', 'domestic', 'stolen_device', 'other')),
  title text NOT NULL,
  description text,
  status text CHECK (status IN ('new', 'assigned', 'in_progress', 'closed', 'archived')) DEFAULT 'new',
  investigator_id uuid REFERENCES public.profiles(id),
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  case_number text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Auto-generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS text AS $$
DECLARE
  year_code text;
  sequence_num int;
  case_num text;
BEGIN
  year_code := TO_CHAR(NOW(), 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM 6) AS int)), 0) + 1
  INTO sequence_num
  FROM public.incident_files
  WHERE case_number LIKE 'CASE-' || year_code || '%';
  
  case_num := 'CASE-' || year_code || '-' || LPAD(sequence_num::text, 6, '0');
  RETURN case_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign case number
CREATE OR REPLACE FUNCTION set_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
    NEW.case_number := generate_case_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_case_number ON public.incident_files;
CREATE TRIGGER trigger_set_case_number
  BEFORE INSERT ON public.incident_files
  FOR EACH ROW EXECUTE FUNCTION set_case_number();

-- ============================================
-- CASE UPDATES & TIMELINE
-- ============================================

CREATE TABLE IF NOT EXISTS public.incident_file_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_file_id uuid REFERENCES public.incident_files(id) ON DELETE CASCADE,
  update_text text NOT NULL,
  media_urls text[],
  officer_id uuid REFERENCES public.profiles(id),
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- CASE EVIDENCE & ATTACHMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.case_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_file_id uuid REFERENCES public.incident_files(id) ON DELETE CASCADE,
  file_type text CHECK (file_type IN ('image', 'video', 'audio', 'document')),
  file_url text NOT NULL,
  file_name text,
  file_size int,
  description text,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- TRACKED DEVICES
-- ============================================

CREATE TABLE IF NOT EXISTS public.tracked_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  device_type text CHECK (device_type IN ('phone', 'tablet', 'laptop', 'watch', 'other')),
  imei text,
  serial_number text,
  status text CHECK (status IN ('active', 'stolen', 'recovered', 'lost')) DEFAULT 'active',
  last_seen_location text,
  last_seen_at timestamptz,
  reported_stolen_at timestamptz,
  recovered_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- COUNSELING & SUPPORT REQUESTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type text CHECK (request_type IN ('counseling', 'emergency', 'legal', 'other')),
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  description text NOT NULL,
  status text CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  assigned_to uuid REFERENCES public.profiles(id),
  scheduled_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_incident_files_user_id ON public.incident_files(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_files_status ON public.incident_files(status);
CREATE INDEX IF NOT EXISTS idx_incident_files_case_number ON public.incident_files(case_number);
CREATE INDEX IF NOT EXISTS idx_incident_file_updates_file_id ON public.incident_file_updates(incident_file_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracked_devices_user_id ON public.tracked_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_devices_status ON public.tracked_devices(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON public.support_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Incident Files
ALTER TABLE public.incident_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cases" ON public.incident_files;
CREATE POLICY "Users can view their own cases" ON public.incident_files
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own cases" ON public.incident_files;
CREATE POLICY "Users can create their own cases" ON public.incident_files
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own cases" ON public.incident_files;
CREATE POLICY "Users can update their own cases" ON public.incident_files
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all cases" ON public.incident_files;
CREATE POLICY "Admins can view all cases" ON public.incident_files
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND level >= 4
    )
  );

-- Case Updates
ALTER TABLE public.incident_file_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view updates on their cases" ON public.incident_file_updates;
CREATE POLICY "Users can view updates on their cases" ON public.incident_file_updates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.incident_files
      WHERE id = incident_file_id AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Officers can add updates" ON public.incident_file_updates;
CREATE POLICY "Officers can add updates" ON public.incident_file_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = officer_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND level >= 3
    )
  );

-- Case Evidence
ALTER TABLE public.case_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view evidence on their cases" ON public.case_evidence;
CREATE POLICY "Users can view evidence on their cases" ON public.case_evidence
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.incident_files
      WHERE id = incident_file_id AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can upload evidence to their cases" ON public.case_evidence;
CREATE POLICY "Users can upload evidence to their cases" ON public.case_evidence
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.incident_files
      WHERE id = incident_file_id AND user_id = (SELECT auth.uid())
    )
  );

-- Tracked Devices
ALTER TABLE public.tracked_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own devices" ON public.tracked_devices;
CREATE POLICY "Users can manage their own devices" ON public.tracked_devices
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Support Requests
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own support requests" ON public.support_requests;
CREATE POLICY "Users can manage their own support requests" ON public.support_requests
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Staff can view and manage support requests" ON public.support_requests;
CREATE POLICY "Staff can view and manage support requests" ON public.support_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND level >= 3
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND level >= 3
    )
  );
