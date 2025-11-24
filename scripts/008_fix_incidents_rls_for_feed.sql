-- Drop the existing policy that's too restrictive
drop policy if exists "incidents_select_public_or_nearby" on public.incidents;

-- Create new policy that allows viewing new incidents from authenticated users
create policy "incidents_select_all_authenticated"
  on public.incidents for select
  using (
    -- Allow authenticated users to see all incidents
    auth.uid() is not null
    -- Or incidents with verification_level >= 1 for public viewing
    or verification_level >= 1
  );

-- Also update the incident_media policy to match
drop policy if exists "incident_media_select_if_incident_visible" on public.incident_media;

create policy "incident_media_select_all_authenticated"
  on public.incident_media for select
  using (
    auth.uid() is not null
    or exists (
      select 1 from public.incidents i
      where i.id = incident_media.incident_id
        and i.verification_level >= 1
    )
  );

-- Update incident_events policy
drop policy if exists "incident_events_select_if_incident_visible" on public.incident_events;

create policy "incident_events_select_all_authenticated"
  on public.incident_events for select
  using (
    auth.uid() is not null
    or exists (
      select 1 from public.incidents i
      where i.id = incident_events.incident_id
        and i.verification_level >= 1
    )
  );
