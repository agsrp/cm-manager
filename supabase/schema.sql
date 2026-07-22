-- =====================================================
-- CM Manager - Supabase Schema
-- =====================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";
create extension if not exists "pg_net";

-- =====================================================
-- Tabla: brands
-- =====================================================
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  color_theme text default '#8b5cf6',
  platforms text[] default '{}',
  notes text,
  hashtags text,
  created_at timestamptz default now()
);

-- =====================================================
-- Tabla: shooting_days
-- =====================================================
create table if not exists public.shooting_days (
  id uuid primary key default gen_random_uuid(),
  date timestamptz not null,
  location text,
  props_needed text[] default '{}',
  clothing_needed text[] default '{}',
  created_at timestamptz default now()
);

-- =====================================================
-- Tabla: posts
-- =====================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  title text not null,
  platform text not null default 'Instagram',
  status text not null default 'idea'
    constraint posts_status_check
    check (status in (
      'idea',
      'script',
      'to_record',
      'to_edit',
      'review',
      'scheduled',
      'published'
    )),
  post_date timestamptz,
  copy text,
  media_url text,
  shooting_day_id uuid references public.shooting_days(id) on delete set null,
  created_at timestamptz default now()
);

-- =====================================================
-- Row Level Security
-- =====================================================
alter table public.brands enable row level security;
alter table public.shooting_days enable row level security;
alter table public.posts enable row level security;

drop policy if exists "authenticated_all_brands" on public.brands;
create policy "authenticated_all_brands"
on public.brands
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated_all_shooting_days" on public.shooting_days;
create policy "authenticated_all_shooting_days"
on public.shooting_days
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated_all_posts" on public.posts;
create policy "authenticated_all_posts"
on public.posts
for all
to authenticated
using (true)
with check (true);

-- =====================================================
-- Índices
-- =====================================================
create index if not exists posts_brand_id_idx on public.posts (brand_id);
create index if not exists posts_status_idx on public.posts (status);
create index if not exists posts_post_date_idx on public.posts (post_date);
create index if not exists posts_shooting_day_id_idx on public.posts (shooting_day_id);
create index if not exists shooting_days_date_idx on public.shooting_days (date);

-- =====================================================
-- Seed mínimo
-- =====================================================
insert into public.brands (name, color_theme)
select 'Marca Demo', '#8b5cf6'
where not exists (
  select 1 from public.brands limit 1
);

-- =====================================================
-- Tabla: team_members
-- =====================================================
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'member',
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.team_members enable row level security;

drop policy if exists "authenticated_all_team_members" on public.team_members;
create policy "authenticated_all_team_members"
on public.team_members
for all
to authenticated
using (true)
with check (true);

-- Índices
create index if not exists team_members_email_idx on public.team_members (email);

-- =====================================================
-- Tabla: push_subscriptions
-- =====================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  notify_ideas boolean default true,
  notify_agenda boolean default true,
  notify_times text[] default '{"09:00", "18:00"}',
  last_notified_at timestamptz,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_user_all" on public.push_subscriptions;
create policy "push_subscriptions_user_all"
on public.push_subscriptions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_service_role" on public.push_subscriptions;
create policy "push_subscriptions_service_role"
on public.push_subscriptions
for all
to service_role
using (true)
with check (true);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index if not exists push_subscriptions_endpoint_idx on public.push_subscriptions (endpoint);

-- =====================================================
-- Tabla: private_activities (Agenda Personal Privada)
-- =====================================================
create table if not exists public.private_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Personal',
  date timestamptz not null,
  end_date timestamptz,
  is_all_day boolean default false,
  status text not null default 'pending'
    constraint private_activities_status_check
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'medium'
    constraint private_activities_priority_check
    check (priority in ('low', 'medium', 'high', 'urgent')),
  color text default '#8b5cf6',
  location text,
  created_at timestamptz default now()
);

-- Row Level Security (RLS) - Solo visible y gestionable por el propio usuario
alter table public.private_activities enable row level security;

drop policy if exists "private_activities_user_all" on public.private_activities;
create policy "private_activities_user_all"
on public.private_activities
for all
to authenticated
-- RLS Policies para el motor de notificaciones del backend
drop policy if exists "push_subscriptions_service_all" on public.push_subscriptions;
create policy "push_subscriptions_service_all"
on public.push_subscriptions
for all
to anon, service_role, authenticated
using (true)
with check (true);

drop policy if exists "private_activities_service_all" on public.private_activities;
create policy "private_activities_service_all"
on public.private_activities
for all
to anon, service_role
using (true)
with check (true);

-- Columna para rastreo de notificaciones de estado
alter table public.private_activities add column if not exists notification_sent boolean default false;
alter table public.posts add column if not exists notification_sent boolean default false;

-- Índices adicionales de notificación
create index if not exists private_activities_notification_sent_idx on public.private_activities (notification_sent);
create index if not exists posts_notification_sent_idx on public.posts (notification_sent);




