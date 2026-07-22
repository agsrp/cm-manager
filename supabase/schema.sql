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
  notify_times text[] default '{"09:00", "14:00", "19:00"}',
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

drop policy if exists "push_subscriptions_anon_select" on public.push_subscriptions;
drop policy if exists "private_activities_anon_select" on public.private_activities;

-- Columna para rastreo de notificaciones de estado
alter table public.private_activities add column if not exists notification_sent boolean default false;
alter table public.posts add column if not exists notification_sent boolean default false;

-- Índices adicionales de notificación
create index if not exists private_activities_notification_sent_idx on public.private_activities (notification_sent);
create index if not exists posts_notification_sent_idx on public.posts (notification_sent);

-- =====================================================
-- Función de Servidor Segura (SECURITY DEFINER)
-- Permite procesar notificaciones sin romper la privacidad de RLS
-- =====================================================
create or replace function public.get_due_push_payloads()
returns table (
  subscription_id uuid,
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  notify_ideas boolean,
  notify_agenda boolean,
  notify_times text[],
  due_activity_title text,
  due_post_title text,
  due_activity_id uuid,
  due_post_id uuid
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    ps.id as subscription_id,
    ps.user_id,
    ps.endpoint,
    ps.p256dh,
    ps.auth,
    ps.notify_ideas,
    ps.notify_agenda,
    ps.notify_times,
    pa.title as due_activity_title,
    po.title as due_post_title,
    pa.id as due_activity_id,
    po.id as due_post_id
  from public.push_subscriptions ps
  left join public.private_activities pa on pa.user_id = ps.user_id 
    and pa.date <= now() 
    and (pa.notification_sent is null or pa.notification_sent = false)
    and pa.status not in ('completed', 'cancelled')
  left join public.posts po on po.post_date <= now() 
    and (po.notification_sent is null or po.notification_sent = false)
    and po.status not in ('published', 'idea');
end;
$$;





