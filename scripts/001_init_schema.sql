-- NGUMU'S EYE Database Schema
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS & PROFILES
-- ============================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text unique,
  trust_score int default 0,
  level int default 0 check (level >= 0 and level <= 5),
  home_geohash text,
  work_geohash text,
  is_banned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- GROUPS & COMMUNITIES
-- ============================================

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  geohash_prefix text not null,
  visibility text check (visibility in ('public','private')) default 'private',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text check (role in ('member','moderator','responder','owner')) default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- ============================================
-- INCIDENTS
-- ============================================

create table if not exists public.incident_types (
  id serial primary key,
  code text unique not null,
  label text not null,
  severity int default 1
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  type_id int references public.incident_types(id),
  title text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  geohash text not null,
  area_radius_m int default 200,
  status text check (status in ('new','verifying','assigned','resolved','archived')) default 'new',
  verification_level int default 0 check (verification_level >= 0 and verification_level <= 3),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.incident_media (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade,
  path text not null,
  sha256 text,
  mime text,
  created_at timestamptz default now()
);

create table if not exists public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade,
  actor uuid references public.profiles(id),
  kind text not null,
  data jsonb,
  created_at timestamptz default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade,
  assignee uuid references public.profiles(id),
  role text check (role in ('responder','moderator')),
  accepted_at timestamptz,
  closed_at timestamptz
);

-- ============================================
-- SOCIAL FEATURES
-- ============================================

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade,
  author uuid references public.profiles(id),
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.reactions (
  incident_id uuid references public.incidents(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  kind text check (kind in ('seen','helpful','not_helpful','follow')),
  created_at timestamptz default now(),
  primary key (incident_id, user_id, kind)
);

-- ============================================
-- SUBSCRIPTIONS & VOUCHERS
-- ============================================

create table if not exists public.plans (
  id serial primary key,
  code text unique not null,
  label text not null,
  period_days int not null,
  price_cents int not null
);

create table if not exists public.vouchers (
  code text primary key,
  plan_id int references public.plans(id),
  days int,
  issued_to_email text,
  redeemed_by uuid references public.profiles(id),
  redeemed_at timestamptz
);

create table if not exists public.user_subscriptions (
  user_id uuid references public.profiles(id),
  plan_id int references public.plans(id),
  started_at timestamptz not null,
  expires_at timestamptz not null,
  primary key (user_id, plan_id, started_at)
);

-- ============================================
-- PARTNERS & WEBHOOKS
-- ============================================

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  webhook_url text,
  api_key text unique,
  created_at timestamptz default now()
);

-- ============================================
-- AUDIT LOGS
-- ============================================

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_incidents_geohash on public.incidents(geohash);
create index if not exists idx_incidents_created_at on public.incidents(created_at desc);
create index if not exists idx_incidents_status on public.incidents(status);
create index if not exists idx_incident_events_incident_id on public.incident_events(incident_id, created_at);
create index if not exists idx_assignments_incident_id on public.assignments(incident_id);
create index if not exists idx_comments_incident_id on public.comments(incident_id);
create index if not exists idx_vouchers_redeemed_by on public.vouchers(redeemed_by);
create index if not exists idx_user_subscriptions_expires_at on public.user_subscriptions(expires_at);
create index if not exists idx_profiles_home_geohash on public.profiles(home_geohash);
create index if not exists idx_profiles_work_geohash on public.profiles(work_geohash);
