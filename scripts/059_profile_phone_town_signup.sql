-- Persist PaySME contact details for new and existing users.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists town text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'display_name', 'User');

  insert into public.profiles (
    id,
    full_name,
    display_name,
    email,
    phone,
    town
  ) values (
    new.id,
    v_full_name,
    v_full_name,
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'town', '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    display_name = excluded.display_name,
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profiles.phone),
    town = coalesce(excluded.town, public.profiles.town);

  return new;
end;
$$;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant update (full_name, display_name, phone, town) on public.profiles to authenticated;
