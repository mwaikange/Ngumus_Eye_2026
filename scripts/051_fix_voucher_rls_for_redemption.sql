-- Fix vouchers table RLS to allow authenticated users to redeem vouchers
-- Users need to be able to SELECT unredeemed vouchers to validate them

-- Add policy to allow authenticated users to view unredeemed vouchers only
CREATE POLICY "authenticated_users_can_view_unredeemed_vouchers" ON vouchers
  FOR SELECT
  TO authenticated
  USING (redeemed_by IS NULL);

-- Add policy to allow authenticated users to update vouchers when redeeming
CREATE POLICY "authenticated_users_can_redeem_vouchers" ON vouchers
  FOR UPDATE
  TO authenticated
  USING (redeemed_by IS NULL)
  WITH CHECK (redeemed_by IS NOT NULL);

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE 'Created RLS policies for voucher redemption';
  RAISE NOTICE '- authenticated_users_can_view_unredeemed_vouchers: Users can SELECT vouchers where redeemed_by IS NULL';
  RAISE NOTICE '- authenticated_users_can_redeem_vouchers: Users can UPDATE vouchers when redeeming (sets redeemed_by)';
END $$;
