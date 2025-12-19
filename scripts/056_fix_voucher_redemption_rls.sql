-- Fix voucher redemption RLS policy
-- Allows authenticated users to redeem unused vouchers

-- Ensure RLS is enabled on vouchers table
alter table public.vouchers enable row level security;

-- Drop existing update policies if they exist (to avoid conflicts)
drop policy if exists "Users can redeem unused vouchers" on public.vouchers;
drop policy if exists "Allow authenticated users to redeem vouchers" on public.vouchers;

-- Create new policy: Allow authenticated users to redeem unused vouchers
create policy "Users can redeem unused vouchers"
on public.vouchers
for update
to authenticated
using (
  -- Can only target vouchers that haven't been redeemed yet
  redeemed_by is null and redeemed_at is null
)
with check (
  -- After update, the voucher must be marked as redeemed
  -- This ensures the user is actually redeeming it, not clearing redemption data
  redeemed_by is not null and redeemed_at is not null
);

-- Verify the policy was created
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where tablename = 'vouchers'
and policyname = 'Users can redeem unused vouchers';
