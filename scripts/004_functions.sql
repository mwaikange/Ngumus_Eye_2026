-- Function to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', null),
    coalesce(new.raw_user_meta_data ->> 'phone', null)
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$;

-- Trigger to create profile on auth user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

drop trigger if exists incidents_updated_at on public.incidents;
create trigger incidents_updated_at
  before update on public.incidents
  for each row
  execute function public.handle_updated_at();

-- Function to redeem voucher
create or replace function public.redeem_voucher(voucher_code text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_voucher record;
  v_plan record;
  v_expires_at timestamptz;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  
  -- Get voucher
  select * into v_voucher from public.vouchers where code = voucher_code for update;
  
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid voucher code');
  end if;
  
  if v_voucher.redeemed_by is not null then
    return jsonb_build_object('ok', false, 'error', 'Voucher already redeemed');
  end if;
  
  -- Get plan
  select * into v_plan from public.plans where id = v_voucher.plan_id;
  
  -- Calculate expiry
  v_expires_at := now() + (coalesce(v_voucher.days, v_plan.period_days) || ' days')::interval;
  
  -- Mark voucher as redeemed
  update public.vouchers
  set redeemed_by = v_user_id, redeemed_at = now()
  where code = voucher_code;
  
  -- Create subscription
  insert into public.user_subscriptions (user_id, plan_id, started_at, expires_at)
  values (v_user_id, v_voucher.plan_id, now(), v_expires_at);
  
  return jsonb_build_object(
    'ok', true,
    'planCode', v_plan.code,
    'expiresAt', v_expires_at
  );
end;
$$;
