-- Issue #196: additive fish-species alias master. Existing species strings remain unchanged.
create or replace function public.fish_species_match_key(input text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select pg_catalog.lower(
    pg_catalog.regexp_replace(normalize(input, NFKC), '^[[:space:]]+|[[:space:]]+$', '', 'g')
  )
$$;

create table if not exists public.fish_species_aliases (
  id uuid primary key default gen_random_uuid(),
  fish_species_id text not null references public.fish_species(id) on update cascade on delete restrict,
  alias_name text not null,
  match_key text not null,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  is_active boolean not null default true,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fish_species_aliases_alias_name_not_blank check (public.fish_species_match_key(alias_name) <> ''),
  constraint fish_species_aliases_match_key_generated check (match_key = public.fish_species_match_key(alias_name)),
  constraint fish_species_aliases_approval_audit check (
    (approval_status = 'approved' and approved_by is not null and approved_at is not null)
    or (approval_status <> 'approved' and approved_at is null)
  )
);

create unique index if not exists fish_species_aliases_approved_active_match_key_key
  on public.fish_species_aliases (match_key)
  where approval_status = 'approved' and is_active = true;
create index if not exists fish_species_aliases_fish_species_id_idx
  on public.fish_species_aliases (fish_species_id);

alter table public.fish_species_aliases enable row level security;
revoke all on table public.fish_species_aliases from anon, authenticated;
grant select on table public.fish_species_aliases to anon, authenticated;

drop policy if exists "Public reads approved active fish species aliases" on public.fish_species_aliases;
create policy "Public reads approved active fish species aliases"
  on public.fish_species_aliases for select
  to anon, authenticated
  using (approval_status = 'approved' and is_active = true);

-- A baseline-only database has the table definition but no seed rows. Guarantee only
-- missing parents; existing production master rows remain untouched.
insert into public.fish_species (id, name_ja, category, season_months, display_order, is_active)
values
  ('aji', 'アジ', 'fish', '{}', 1, true), ('saba', 'サバ', 'fish', '{}', 2, true),
  ('iwashi', 'イワシ', 'fish', '{}', 3, true), ('aomono', '青物', 'category', '{}', 4, true),
  ('shiira', 'シイラ', 'fish', '{}', 5, true), ('hirame', 'ヒラメ', 'fish', '{}', 6, true),
  ('magochi', 'マゴチ', 'fish', '{}', 7, true), ('seabass', 'シーバス', 'fish', '{}', 8, true),
  ('aoriika', 'アオリイカ', 'squid', '{}', 9, true), ('yariika', 'ヤリイカ', 'squid', '{}', 10, true),
  ('kouika', 'コウイカ', 'squid', '{}', 11, true), ('chinu', 'チヌ', 'fish', '{}', 12, true),
  ('madai', '真鯛', 'fish', '{}', 13, true), ('kisu', 'キス', 'fish', '{}', 14, true),
  ('rockfish', '根魚', 'category', '{}', 15, true)
on conflict (id) do nothing;

insert into public.fish_species_aliases
  (id, fish_species_id, alias_name, match_key, approval_status, is_active, approved_by, approved_at)
select
  seed.id::uuid, seed.fish_species_id, seed.alias_name,
  public.fish_species_match_key(seed.alias_name), 'approved', true, 'migration:issue-196', now()
from (values
  ('00000000-0000-4000-8000-000000000001', 'aji', 'アジ'),
  ('00000000-0000-4000-8000-000000000002', 'saba', 'サバ'),
  ('00000000-0000-4000-8000-000000000003', 'iwashi', 'イワシ'),
  ('00000000-0000-4000-8000-000000000004', 'aomono', '青物'),
  ('00000000-0000-4000-8000-000000000005', 'shiira', 'シイラ'),
  ('00000000-0000-4000-8000-000000000006', 'hirame', 'ヒラメ'),
  ('00000000-0000-4000-8000-000000000007', 'magochi', 'マゴチ'),
  ('00000000-0000-4000-8000-000000000008', 'seabass', 'シーバス'),
  ('00000000-0000-4000-8000-000000000009', 'aoriika', 'アオリイカ'),
  ('00000000-0000-4000-8000-000000000010', 'yariika', 'ヤリイカ'),
  ('00000000-0000-4000-8000-000000000011', 'kouika', 'コウイカ'),
  ('00000000-0000-4000-8000-000000000012', 'chinu', 'チヌ'),
  ('00000000-0000-4000-8000-000000000013', 'madai', '真鯛'),
  ('00000000-0000-4000-8000-000000000014', 'kisu', 'キス'),
  ('00000000-0000-4000-8000-000000000015', 'rockfish', '根魚'),
  ('00000000-0000-4000-8000-000000000016', 'chinu', '黒鯛'),
  ('00000000-0000-4000-8000-000000000017', 'chinu', 'クロダイ')
) as seed(id, fish_species_id, alias_name)
on conflict (id) do update set
  fish_species_id = excluded.fish_species_id,
  alias_name = excluded.alias_name,
  match_key = excluded.match_key,
  approval_status = excluded.approval_status,
  is_active = excluded.is_active,
  approved_by = excluded.approved_by,
  approved_at = excluded.approved_at,
  updated_at = now();
