-- =====================================================
-- CM Manager - Supabase Schema
-- =====================================================

create extension if not exists "pgcrypto";

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
