-- Issue #220 batch 2: user-approved regional and growth-stage names only.
insert into public.fish_species_aliases
  (id, fish_species_id, alias_name, match_key, approval_status, is_active, approved_by, approved_at)
select
  seed.id::uuid,
  seed.fish_species_id,
  seed.alias_name,
  public.fish_species_match_key(seed.alias_name),
  'approved',
  true,
  'migration:issue-220-batch-2',
  now()
from (values
  ('00000000-0000-4000-8000-000000000300', 'kasago', 'アラカブ'),
  ('00000000-0000-4000-8000-000000000301', 'kasago', 'ガシラ'),
  ('00000000-0000-4000-8000-000000000302', 'isaki', 'イッサキ'),
  ('00000000-0000-4000-8000-000000000303', 'kijihata', 'アコウ'),
  ('00000000-0000-4000-8000-000000000304', 'oniokoze', 'オグシ'),
  ('00000000-0000-4000-8000-000000000305', 'madai', 'マチャ'),
  ('00000000-0000-4000-8000-000000000306', 'madai', 'チャンイオ'),
  ('00000000-0000-4000-8000-000000000307', 'buri', 'ヤズ'),
  ('00000000-0000-4000-8000-000000000308', 'buri', 'ハマチ'),
  ('00000000-0000-4000-8000-000000000309', 'sawara', 'サゴシ')
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
