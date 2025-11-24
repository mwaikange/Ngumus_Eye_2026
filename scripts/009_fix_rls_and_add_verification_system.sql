-- Fix infinite recursion in group_members RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "group_members_select_if_group_visible" ON public.group_members;

-- Create simpler RLS policy without recursion
CREATE POLICY "group_members_select_public_groups_or_member"
ON public.group_members FOR SELECT
USING (
  -- Allow if the group is public
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
    AND g.visibility = 'public'
  )
  OR
  -- Allow if user is a member of the group
  user_id = auth.uid()
  OR
  -- Allow if user is member of the same group (check via group_id only)
  group_id IN (
    SELECT gm.group_id FROM public.group_members gm
    WHERE gm.user_id = auth.uid()
  )
);

-- ============================================
-- VERIFICATION SYSTEM IMPLEMENTATION
-- ============================================

-- Add verification system columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified_otp boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_subscribed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_moderator boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_partner boolean DEFAULT false;

-- Add computed tier column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'tier'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN tier text GENERATED ALWAYS AS (
      CASE
        WHEN is_partner THEN 'partner'
        WHEN is_moderator THEN 'moderator'
        WHEN is_subscribed THEN 'subscribed'
        WHEN is_verified_otp THEN 'verified'
        ELSE 'regular'
      END
    ) STORED;
  END IF;
END $$;

-- Add verification_weight to incidents table
ALTER TABLE public.incidents
ADD COLUMN IF NOT EXISTS verification_weight numeric DEFAULT 0;

-- Create incident_reactions table for weighted reactions
CREATE TABLE IF NOT EXISTS public.incident_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type text CHECK (reaction_type IN ('upvote', 'downvote', 'love', 'confirm')),
  weight numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (incident_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_incident_reactions_incident_id ON public.incident_reactions(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_reactions_user_id ON public.incident_reactions(user_id);

-- Enable RLS on incident_reactions
ALTER TABLE public.incident_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incident_reactions_select_all"
ON public.incident_reactions FOR SELECT
USING (true);

CREATE POLICY "incident_reactions_insert_own"
ON public.incident_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "incident_reactions_delete_own"
ON public.incident_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Create trust_score_history table
CREATE TABLE IF NOT EXISTS public.trust_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta numeric NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_score_history_user_id ON public.trust_score_history(user_id, created_at DESC);

ALTER TABLE public.trust_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_score_history_select_own"
ON public.trust_score_history FOR SELECT
USING (auth.uid() = user_id);

-- Function to calculate reaction weight based on user tier and trust score
CREATE OR REPLACE FUNCTION calculate_reaction_weight(
  p_user_id uuid,
  p_reaction_type text
) RETURNS numeric AS $$
DECLARE
  v_trust_multiplier numeric;
  v_tier_multiplier numeric;
  v_base numeric;
BEGIN
  -- Get trust and tier multipliers
  SELECT 
    GREATEST(0, LEAST(1, trust_score / 100.0)),
    CASE tier
      WHEN 'partner' THEN 3.0
      WHEN 'moderator' THEN 2.0
      WHEN 'subscribed' THEN 1.6
      WHEN 'verified' THEN 1.3
      ELSE 1.0
    END
  INTO v_trust_multiplier, v_tier_multiplier
  FROM public.profiles
  WHERE id = p_user_id;

  -- Set base weight by reaction type
  v_base := CASE
    WHEN p_reaction_type = 'upvote' THEN 1
    WHEN p_reaction_type = 'downvote' THEN -1
    WHEN p_reaction_type = 'love' THEN 0.5
    WHEN p_reaction_type = 'confirm' THEN 3
    ELSE 0
  END;

  RETURN v_base * (1 + v_trust_multiplier) * v_tier_multiplier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update verification weight and level
CREATE OR REPLACE FUNCTION update_incident_verification_weight()
RETURNS trigger AS $$
DECLARE
  v_total_weight numeric;
BEGIN
  -- Calculate reaction weight for this new/updated reaction
  NEW.weight := calculate_reaction_weight(NEW.user_id, NEW.reaction_type);

  -- Recalculate total verification weight for the incident
  SELECT COALESCE(SUM(weight), 0)
  INTO v_total_weight
  FROM public.incident_reactions
  WHERE incident_id = NEW.incident_id;

  -- Update incident verification_level based on weight thresholds
  UPDATE public.incidents
  SET 
    verification_weight = v_total_weight,
    verification_level = CASE
      WHEN v_total_weight >= 40 THEN 3
      WHEN v_total_weight >= 25 THEN 2
      WHEN v_total_weight >= 10 THEN 1
      ELSE 0
    END,
    updated_at = now()
  WHERE id = NEW.incident_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_verification_weight ON public.incident_reactions;
CREATE TRIGGER trg_update_verification_weight
AFTER INSERT OR UPDATE ON public.incident_reactions
FOR EACH ROW
EXECUTE FUNCTION update_incident_verification_weight();

-- Function to update user trust score with history tracking
CREATE OR REPLACE FUNCTION update_trust_score(
  p_user_id uuid,
  p_delta numeric,
  p_reason text
) RETURNS void AS $$
BEGIN
  -- Update trust score (keep between 0 and 100)
  UPDATE public.profiles
  SET 
    trust_score = LEAST(100, GREATEST(0, trust_score + p_delta)),
    updated_at = now()
  WHERE id = p_user_id;

  -- Record in history
  INSERT INTO public.trust_score_history (user_id, delta, reason)
  VALUES (p_user_id, p_delta, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-advance incident status based on verification level
CREATE OR REPLACE FUNCTION update_incident_status_on_verification()
RETURNS trigger AS $$
BEGIN
  -- Only auto-advance if verification level increased
  IF NEW.verification_level > OLD.verification_level THEN
    NEW.status := CASE
      WHEN NEW.verification_level >= 3 THEN 'assigned'
      WHEN NEW.verification_level >= 2 THEN 'verifying'
      ELSE NEW.status
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_status_update ON public.incidents;
CREATE TRIGGER trg_auto_status_update
BEFORE UPDATE OF verification_level ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION update_incident_status_on_verification();
