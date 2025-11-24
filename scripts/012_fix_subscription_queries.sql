-- Fix RLS policies for user_subscriptions and plans to allow proper joins

-- PLANS TABLE - Allow everyone to read plans (they are public pricing)

DROP POLICY IF EXISTS "plans_select_all" ON plans;
DROP POLICY IF EXISTS "plans_select_admin" ON plans;

-- Everyone can see available plans
CREATE POLICY "Anyone can view plans"
  ON plans FOR SELECT
  USING (true);

-- Only admins can modify plans
CREATE POLICY "Admins can insert plans"
  ON plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.level >= 4
    )
  );

CREATE POLICY "Admins can update plans"
  ON plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.level >= 4
    )
  );

-- USER_SUBSCRIPTIONS - Simplify policies

DROP POLICY IF EXISTS "user_subscriptions_select_own" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_insert_own" ON user_subscriptions;

-- Users can see their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users or admins can create subscriptions
CREATE POLICY "Users or admins can create subscriptions"
  ON user_subscriptions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.level >= 4
    )
  );

-- Admins can update subscriptions
CREATE POLICY "Admins can update subscriptions"
  ON user_subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.level >= 4
    )
  );

-- Add helper function to check if user is subscribed

CREATE OR REPLACE FUNCTION is_user_subscribed(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_subscriptions
    WHERE user_id = p_user_id
      AND expires_at > NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_user_subscribed TO authenticated;

-- Add view for user subscription status (avoids RLS join issues)

DROP VIEW IF EXISTS user_subscription_status;

CREATE VIEW user_subscription_status AS
SELECT
  us.user_id,
  us.plan_id,
  us.started_at,
  us.expires_at,
  p.code as plan_code,
  p.label as plan_label,
  p.price_cents,
  p.period_days,
  CASE
    WHEN us.expires_at > NOW() THEN true
    ELSE false
  END as currently_active
FROM user_subscriptions us
LEFT JOIN plans p ON us.plan_id = p.id;

-- Grant access to the view
GRANT SELECT ON user_subscription_status TO authenticated;
