-- External catch memo table design for Post-MVP-023.
-- Design only: do not run this in a production Supabase project until the next checkpoint is approved.
-- This file intentionally enables RLS and does not grant broad anon insert/update/delete.
-- Do not paste project secrets, privileged server keys, database URLs, or passwords here.

create table if not exists public.external_catch_memos (
  id text primary key,
  species text not null,
  caught_date date not null,
  area_name text not null,
  estimated_spot_name text,
  spot_id text references public.fishing_spots (id) on update cascade on delete set null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  coordinate_precision text not null default 'unknown',
  method text,
  catch_count integer,
  size_cm numeric(5, 1),
  source_id text not null references public.source_registry (source_id) on update cascade on delete restrict,
  source_name text not null,
  source_url text not null,
  acquisition_method text not null default 'manual',
  confidence text not null default 'medium',
  environment_match_notes text[] not null default '{}',
  user_memo text,
  owner_id uuid references auth.users (id) on update cascade on delete set null,
  created_by text not null default 'manual_local_storage_migration',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_catch_memos_coordinate_precision_check check (
    coordinate_precision in ('exact', 'approximate', 'rounded', 'unknown')
  ),
  constraint external_catch_memos_latitude_check check (latitude is null or latitude between -90 and 90),
  constraint external_catch_memos_longitude_check check (longitude is null or longitude between -180 and 180),
  constraint external_catch_memos_acquisition_method_check check (
    acquisition_method in ('manual', 'ai_assisted', 'auto')
  ),
  constraint external_catch_memos_confidence_check check (confidence in ('high', 'medium', 'low')),
  constraint external_catch_memos_count_check check (catch_count is null or catch_count >= 0),
  constraint external_catch_memos_size_cm_check check (size_cm is null or size_cm >= 0),
  constraint external_catch_memos_source_url_check check (source_url ~ '^https?://'),
  constraint external_catch_memos_environment_notes_check check (array_position(environment_match_notes, null) is null),
  constraint external_catch_memos_user_memo_length_check check (user_memo is null or char_length(user_memo) <= 240),
  constraint external_catch_memos_created_by_check check (
    created_by in ('manual_local_storage_migration', 'authenticated_user', 'admin_import')
  )
);

create index if not exists external_catch_memos_caught_date_idx
on public.external_catch_memos (caught_date desc);

create index if not exists external_catch_memos_area_name_idx
on public.external_catch_memos (area_name);

create index if not exists external_catch_memos_species_idx
on public.external_catch_memos (species);

create index if not exists external_catch_memos_spot_id_idx
on public.external_catch_memos (spot_id);

create index if not exists external_catch_memos_source_id_idx
on public.external_catch_memos (source_id);

create index if not exists external_catch_memos_owner_id_idx
on public.external_catch_memos (owner_id);

create index if not exists external_catch_memos_active_updated_idx
on public.external_catch_memos (is_deleted, updated_at desc);

alter table public.external_catch_memos enable row level security;

revoke all on table public.external_catch_memos from anon, authenticated;

grant select on table public.external_catch_memos to authenticated;

-- No anon policies are defined in this design file.
-- Future authenticated read/write policies should scope rows by owner_id = auth.uid().
-- Future admin import should run only from approved server-side code with secrets outside the client bundle.
