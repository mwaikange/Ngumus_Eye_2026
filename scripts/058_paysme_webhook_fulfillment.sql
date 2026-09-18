-- PaySME webhook fulfilment.
-- Apply this migration before enabling the PaySME webhook URL.

create table if not exists public.paysme_payment_fulfillments (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null unique,
  generated_code text unique,
  invoice_id text not null unique,
  user_id uuid not null references public.profiles(id),
  plan_id integer not null references public.plans(id),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'NAD',
  paid_at timestamptz,
  payload jsonb not null,
  fulfilled_at timestamptz not null default now()
);

alter table public.paysme_payment_fulfillments enable row level security;

create or replace function public.fulfill_paysme_payment(
  p_transaction_id text,
  p_generated_code text,
  p_invoice_id text,
  p_user_id uuid,
  p_plan_code text,
  p_amount_cents integer,
  p_currency text,
  p_paid_at timestamptz,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.plans%rowtype;
  v_subscription public.user_subscriptions%rowtype;
  v_expires_at timestamptz;
begin
  if p_transaction_id is null or p_invoice_id is null then
    raise exception 'Missing PaySME transaction identifiers';
  end if;

  if upper(coalesce(p_currency, '')) <> 'NAD' then
    raise exception 'Unsupported payment currency';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Payment user was not found';
  end if;

  select * into v_plan
  from public.plans
  where code = p_plan_code;

  if not found then
    raise exception 'Payment plan was not found';
  end if;

  if v_plan.price_cents <> p_amount_cents then
    raise exception 'Paid amount does not match the selected plan';
  end if;

  if exists (
    select 1 from public.paysme_payment_fulfillments
    where transaction_id = p_transaction_id or invoice_id = p_invoice_id
  ) then
    return jsonb_build_object('ok', true, 'already_fulfilled', true);
  end if;

  insert into public.paysme_payment_fulfillments (
    transaction_id, generated_code, invoice_id, user_id, plan_id,
    amount_cents, currency, paid_at, payload
  ) values (
    p_transaction_id, nullif(p_generated_code, ''), p_invoice_id, p_user_id, v_plan.id,
    p_amount_cents, upper(p_currency), p_paid_at, p_payload
  );

  select * into v_subscription
  from public.user_subscriptions
  where user_id = p_user_id
    and status = 'active'
    and expires_at > now()
  order by expires_at desc
  limit 1
  for update;

  if found then
    v_expires_at := greatest(v_subscription.expires_at, now())
      + make_interval(days => v_plan.period_days);

    update public.user_subscriptions
    set plan_id = v_plan.id,
        expires_at = v_expires_at,
        status = 'active'
    where user_id = v_subscription.user_id
      and plan_id = v_subscription.plan_id
      and started_at = v_subscription.started_at;
  else
    v_expires_at := now() + make_interval(days => v_plan.period_days);

    insert into public.user_subscriptions (user_id, plan_id, started_at, expires_at, status)
    values (p_user_id, v_plan.id, now(), v_expires_at, 'active');
  end if;

  return jsonb_build_object(
    'ok', true,
    'already_fulfilled', false,
    'plan_code', v_plan.code,
    'expires_at', v_expires_at
  );
end;
$$;

revoke all on function public.fulfill_paysme_payment(text, text, text, uuid, text, integer, text, timestamptz, jsonb)
from public, anon, authenticated;

grant execute on function public.fulfill_paysme_payment(text, text, text, uuid, text, integer, text, timestamptz, jsonb)
to service_role;
