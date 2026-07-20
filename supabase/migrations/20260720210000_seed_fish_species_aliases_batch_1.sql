-- Issue #211 batch 1: user-approved regional/common names only.
insert into public.fish_species_aliases
  (id, fish_species_id, alias_name, match_key, approval_status, is_active, approved_by, approved_at)
select
  seed.id::uuid,
  seed.fish_species_id,
  seed.alias_name,
  public.fish_species_match_key(seed.alias_name),
  'approved',
  true,
  'migration:issue-211-batch-1',
  now()
from (values
  ('00000000-0000-4000-8000-000000000200', 'aoriika', 'ミズイカ'),
  ('00000000-0000-4000-8000-000000000201', 'aoriika', 'モイカ'),
  ('00000000-0000-4000-8000-000000000202', 'kisu', 'シロギス'),
  ('00000000-0000-4000-8000-000000000203', 'kisu', 'キスゴ'),
  ('00000000-0000-4000-8000-000000000204', 'seabass', 'スズキ')
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
