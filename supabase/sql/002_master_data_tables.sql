-- Master data table definitions for Post-MVP-019.
-- Run manually in the Supabase SQL Editor in a later step. Do not paste project secrets here.
-- This file defines schema, minimal constraints/indexes, RLS, and read-only grants only.
-- It does not include seed data or application integration.

create table if not exists public.fish_species (
  id text primary key,
  name_ja text not null,
  category text not null,
  season_months smallint[] not null default '{}',
  display_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fish_species_name_ja_key unique (name_ja),
  constraint fish_species_category_check check (category in ('fish', 'squid', 'category')),
  constraint fish_species_season_months_check check (
    array_position(season_months, null) is null
    and season_months <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]::smallint[]
  )
);

create index if not exists fish_species_category_idx
on public.fish_species (category);

create index if not exists fish_species_display_order_idx
on public.fish_species (display_order);

create table if not exists public.fishing_spots (
  id text primary key,
  name text not null,
  area_name text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  spot_type text not null,
  shore_access text not null,
  coordinate_precision text not null,
  target_species text[] not null default '{}',
  recommended_methods text[] not null default '{}',
  notes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fishing_spots_name_area_name_key unique (name, area_name),
  constraint fishing_spots_latitude_check check (latitude between -90 and 90),
  constraint fishing_spots_longitude_check check (longitude between -180 and 180),
  constraint fishing_spots_coordinate_precision_check check (
    coordinate_precision in ('exact', 'approximate', 'rounded')
  ),
  constraint fishing_spots_target_species_check check (array_position(target_species, null) is null),
  constraint fishing_spots_recommended_methods_check check (array_position(recommended_methods, null) is null),
  constraint fishing_spots_notes_check check (array_position(notes, null) is null)
);

create index if not exists fishing_spots_area_name_idx
on public.fishing_spots (area_name);

create index if not exists fishing_spots_spot_type_idx
on public.fishing_spots (spot_type);

create index if not exists fishing_spots_coordinate_precision_idx
on public.fishing_spots (coordinate_precision);

create table if not exists public.source_registry (
  source_id text primary key,
  source_name text not null,
  source_type text not null,
  target_area_names text[] not null default '{}',
  base_url text not null,
  crawl_policy text not null,
  robots_status text not null,
  terms_status text not null,
  reviewed_at date,
  review_urls text[] not null default '{}',
  review_summary text,
  notes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_registry_source_type_check check (
    source_type in ('shop', 'portal', 'tide', 'sns_like', 'other')
  ),
  constraint source_registry_crawl_policy_check check (
    crawl_policy in ('allowed', 'manualOnly', 'referenceOnly', 'unknown')
  ),
  constraint source_registry_robots_status_check check (
    robots_status in ('unchecked', 'allowed', 'disallowed', 'partial', 'unknown')
  ),
  constraint source_registry_terms_status_check check (
    terms_status in ('unchecked', 'allowed', 'restricted', 'unknown')
  ),
  constraint source_registry_target_area_names_check check (array_position(target_area_names, null) is null),
  constraint source_registry_review_urls_check check (array_position(review_urls, null) is null),
  constraint source_registry_notes_check check (array_position(notes, null) is null)
);

create index if not exists source_registry_source_type_idx
on public.source_registry (source_type);

create index if not exists source_registry_crawl_policy_idx
on public.source_registry (crawl_policy);

create index if not exists source_registry_terms_status_idx
on public.source_registry (terms_status);

create index if not exists source_registry_robots_status_idx
on public.source_registry (robots_status);

create index if not exists source_registry_reviewed_at_idx
on public.source_registry (reviewed_at);

alter table public.fish_species enable row level security;
alter table public.fishing_spots enable row level security;
alter table public.source_registry enable row level security;

revoke all on table public.fish_species from anon, authenticated;
revoke all on table public.fishing_spots from anon, authenticated;
revoke all on table public.source_registry from anon, authenticated;

grant select on table public.fish_species to anon, authenticated;
grant select on table public.fishing_spots to anon, authenticated;
grant select on table public.source_registry to anon, authenticated;

drop policy if exists "Allow anon and authenticated read fish species" on public.fish_species;
drop policy if exists "Allow anon and authenticated read fishing spots" on public.fishing_spots;
drop policy if exists "Allow anon and authenticated read source registry" on public.source_registry;

create policy "Allow anon and authenticated read fish species"
on public.fish_species
for select
to anon, authenticated
using (is_active = true);

create policy "Allow anon and authenticated read fishing spots"
on public.fishing_spots
for select
to anon, authenticated
using (is_active = true);

create policy "Allow anon and authenticated read source registry"
on public.source_registry
for select
to anon, authenticated
using (is_active = true);
