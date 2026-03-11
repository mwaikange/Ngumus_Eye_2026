CREATE TABLE IF NOT EXISTS public.incident_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(incident_id, user_id)
);

ALTER TABLE public.incident_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can follow incidents" ON public.incident_followers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow incidents" ON public.incident_followers
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own follows" ON public.incident_followers
  FOR SELECT USING (auth.uid() = user_id);
