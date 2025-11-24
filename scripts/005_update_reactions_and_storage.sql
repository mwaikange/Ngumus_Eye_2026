-- Update reactions table to support upvote, downvote, love
alter table public.reactions drop constraint if exists reactions_kind_check;
alter table public.reactions add constraint reactions_kind_check 
  check (kind in ('upvote','downvote','love','seen','helpful','not_helpful','follow'));

-- Add reaction counts to incidents for better performance
alter table public.incidents add column if not exists upvotes int default 0;
alter table public.incidents add column if not exists downvotes int default 0;
alter table public.incidents add column if not exists loves int default 0;

-- Add expiry tracking
alter table public.incidents add column if not exists expires_at timestamptz;

-- Create storage bucket for incident media
insert into storage.buckets (id, name, public)
values ('incident-media', 'incident-media', true)
on conflict (id) do nothing;

-- Storage policies for incident media
create policy "Anyone can view incident media"
on storage.objects for select
using (bucket_id = 'incident-media');

create policy "Authenticated users can upload incident media"
on storage.objects for insert
with check (
  bucket_id = 'incident-media' 
  and auth.role() = 'authenticated'
);

create policy "Users can delete their own incident media"
on storage.objects for delete
using (
  bucket_id = 'incident-media' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Function to update reaction counts
create or replace function update_incident_reaction_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.kind = 'upvote' then
      update incidents set upvotes = upvotes + 1 where id = NEW.incident_id;
    elsif NEW.kind = 'downvote' then
      update incidents set downvotes = downvotes + 1 where id = NEW.incident_id;
    elsif NEW.kind = 'love' then
      update incidents set loves = loves + 1 where id = NEW.incident_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.kind = 'upvote' then
      update incidents set upvotes = upvotes - 1 where id = OLD.incident_id;
    elsif OLD.kind = 'downvote' then
      update incidents set downvotes = downvotes - 1 where id = OLD.incident_id;
    elsif OLD.kind = 'love' then
      update incidents set loves = loves - 1 where id = OLD.incident_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger update_reaction_counts_trigger
after insert or delete on reactions
for each row execute function update_incident_reaction_counts();

-- Function to set incident expiry based on subscription
create or replace function set_incident_expiry()
returns trigger as $$
declare
  user_has_subscription boolean;
  expiry_days int;
begin
  -- Check if user has active subscription
  select exists(
    select 1 from user_subscriptions
    where user_id = NEW.created_by
    and expires_at > now()
  ) into user_has_subscription;
  
  -- Set expiry: 30 days for subscribed, 7 days for unsubscribed
  if user_has_subscription then
    expiry_days := 30;
  else
    expiry_days := 7;
  end if;
  
  NEW.expires_at := now() + (expiry_days || ' days')::interval;
  
  return NEW;
end;
$$ language plpgsql;

create trigger set_incident_expiry_trigger
before insert on incidents
for each row execute function set_incident_expiry();

-- Function to delete expired incidents and their media
create or replace function delete_expired_incidents()
returns void as $$
declare
  expired_incident record;
  media_record record;
begin
  -- Loop through expired incidents
  for expired_incident in 
    select id from incidents where expires_at < now()
  loop
    -- Delete associated media files from storage
    for media_record in
      select path from incident_media where incident_id = expired_incident.id
    loop
      perform storage.delete_object('incident-media', media_record.path);
    end loop;
    
    -- Delete the incident (cascade will handle related records)
    delete from incidents where id = expired_incident.id;
  end loop;
end;
$$ language plpgsql;
