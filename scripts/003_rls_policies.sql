-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_media enable row level security;
alter table public.incident_events enable row level security;
alter table public.assignments enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.plans enable row level security;
alter table public.vouchers enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.partners enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================
-- PROFILES POLICIES
-- ============================================

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id or auth.uid() is not null);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================
-- INCIDENTS POLICIES
-- ============================================

create policy "incidents_select_public_or_nearby"
  on public.incidents for select
  using (
    verification_level >= 1
    or created_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          left(incidents.geohash, 6) = left(p.home_geohash, 6)
          or left(incidents.geohash, 6) = left(p.work_geohash, 6)
        )
    )
  );

create policy "incidents_insert_authenticated"
  on public.incidents for insert
  with check (auth.uid() is not null and auth.uid() = created_by);

create policy "incidents_update_owner_or_moderator"
  on public.incidents for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.user_id = auth.uid()
        and gm.role in ('moderator', 'responder', 'owner')
    )
  );

-- ============================================
-- INCIDENT MEDIA POLICIES
-- ============================================

create policy "incident_media_select_if_incident_visible"
  on public.incident_media for select
  using (
    exists (
      select 1 from public.incidents i
      where i.id = incident_media.incident_id
        and (
          i.verification_level >= 1
          or i.created_by = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
              and (
                left(i.geohash, 6) = left(p.home_geohash, 6)
                or left(i.geohash, 6) = left(p.work_geohash, 6)
              )
          )
        )
    )
  );

create policy "incident_media_insert_authenticated"
  on public.incident_media for insert
  with check (auth.uid() is not null);

-- ============================================
-- INCIDENT EVENTS POLICIES
-- ============================================

create policy "incident_events_select_if_incident_visible"
  on public.incident_events for select
  using (
    exists (
      select 1 from public.incidents i
      where i.id = incident_events.incident_id
        and (
          i.verification_level >= 1
          or i.created_by = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
              and (
                left(i.geohash, 6) = left(p.home_geohash, 6)
                or left(i.geohash, 6) = left(p.work_geohash, 6)
              )
          )
        )
    )
  );

create policy "incident_events_insert_authenticated"
  on public.incident_events for insert
  with check (auth.uid() is not null);

-- ============================================
-- COMMENTS POLICIES
-- ============================================

create policy "comments_select_if_incident_visible"
  on public.comments for select
  using (
    exists (
      select 1 from public.incidents i
      where i.id = comments.incident_id
        and (
          i.verification_level >= 1
          or i.created_by = auth.uid()
        )
    )
  );

create policy "comments_insert_own"
  on public.comments for insert
  with check (auth.uid() = author);

create policy "comments_update_own"
  on public.comments for update
  using (auth.uid() = author);

create policy "comments_delete_own"
  on public.comments for delete
  using (auth.uid() = author);

-- ============================================
-- REACTIONS POLICIES
-- ============================================

create policy "reactions_select_all"
  on public.reactions for select
  using (true);

create policy "reactions_insert_own"
  on public.reactions for insert
  with check (auth.uid() = user_id);

create policy "reactions_delete_own"
  on public.reactions for delete
  using (auth.uid() = user_id);

-- ============================================
-- GROUPS POLICIES
-- ============================================

create policy "groups_select_public_or_member"
  on public.groups for select
  using (
    visibility = 'public'
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );

create policy "groups_insert_authenticated"
  on public.groups for insert
  with check (auth.uid() = created_by);

create policy "groups_update_owner"
  on public.groups for update
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id
        and gm.user_id = auth.uid()
        and gm.role = 'owner'
    )
  );

-- ============================================
-- GROUP MEMBERS POLICIES
-- ============================================

create policy "group_members_select_if_group_visible"
  on public.group_members for select
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and (
          g.visibility = 'public'
          or exists (
            select 1 from public.group_members gm2
            where gm2.group_id = g.id and gm2.user_id = auth.uid()
          )
        )
    )
  );

create policy "group_members_insert_owner_or_self"
  on public.group_members for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner', 'moderator')
    )
  );

-- ============================================
-- ASSIGNMENTS POLICIES
-- ============================================

create policy "assignments_select_involved"
  on public.assignments for select
  using (
    assignee = auth.uid()
    or exists (
      select 1 from public.incidents i
      where i.id = assignments.incident_id and i.created_by = auth.uid()
    )
    or exists (
      select 1 from public.group_members gm
      where gm.user_id = auth.uid() and gm.role in ('moderator', 'owner')
    )
  );

create policy "assignments_insert_moderator"
  on public.assignments for insert
  with check (
    exists (
      select 1 from public.group_members gm
      where gm.user_id = auth.uid() and gm.role in ('moderator', 'responder', 'owner')
    )
  );

-- ============================================
-- PLANS POLICIES (public read)
-- ============================================

create policy "plans_select_all"
  on public.plans for select
  using (true);

-- ============================================
-- USER SUBSCRIPTIONS POLICIES
-- ============================================

create policy "user_subscriptions_select_own"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

create policy "user_subscriptions_insert_own"
  on public.user_subscriptions for insert
  with check (auth.uid() = user_id);

-- ============================================
-- VOUCHERS POLICIES (admin only, handled via functions)
-- ============================================

create policy "vouchers_select_admin"
  on public.vouchers for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.level >= 4
    )
  );

-- ============================================
-- PARTNERS POLICIES (admin only)
-- ============================================

create policy "partners_select_admin"
  on public.partners for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.level >= 4
    )
  );

-- ============================================
-- AUDIT LOGS POLICIES (admin only)
-- ============================================

create policy "audit_logs_select_admin"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.level >= 4
    )
  );
