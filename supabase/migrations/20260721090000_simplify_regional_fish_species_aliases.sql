-- Issue #220 follow-up: normalize unambiguous regional names without adding
-- regional, growth-stage, or alias-type schema.
update public.fish_species
set name_ja = 'スズキ', updated_at = now()
where id = 'seabass';

update public.fish_species
set name_ja = 'ヤリイカ', is_active = true, is_selectable = true, updated_at = now()
where id = 'kensakiika';

-- Preserve the old ID for existing foreign keys while preventing new use.
update public.fish_species
set is_active = false, is_selectable = false, updated_at = now()
where id = 'yariika';

-- The original canonical ヤリイカ alias is retained and reassigned rather
-- than deleted, so existing alias references and deterministic IDs survive.
update public.fish_species_aliases
set fish_species_id = 'kensakiika', approval_status = 'approved', is_active = true,
  approved_by = 'migration:issue-220-regional-simplification', approved_at = now(), updated_at = now()
where match_key = public.fish_species_match_key('ヤリイカ');

insert into public.fish_species_aliases
  (id, fish_species_id, alias_name, match_key, approval_status, is_active, approved_by, approved_at)
select seed.id::uuid, seed.fish_species_id, seed.alias_name,
  public.fish_species_match_key(seed.alias_name), 'approved', true,
  'migration:issue-220-regional-simplification', now()
from (values
  ('00000000-0000-4000-8000-000000000311', 'seabass', 'セイゴ'),
  ('00000000-0000-4000-8000-000000000312', 'seabass', 'フッコ'),
  ('00000000-0000-4000-8000-000000000314', 'kensakiika', 'アカイカ'),
  ('00000000-0000-4000-8000-000000000315', 'kensakiika', 'ササイカ'),
  ('00000000-0000-4000-8000-000000000316', 'hiramasa', 'ヒラス'),
  ('00000000-0000-4000-8000-000000000317', 'kanpachi', 'ネリゴ'),
  ('00000000-0000-4000-8000-000000000318', 'mejina', 'クロ'),
  ('00000000-0000-4000-8000-000000000319', 'chinu', 'メイタ'),
  ('00000000-0000-4000-8000-000000000320', 'konoshiro', 'コハダ'),
  ('00000000-0000-4000-8000-000000000321', 'konoshiro', 'ツナシ'),
  ('00000000-0000-4000-8000-000000000322', 'bora', 'イナ'),
  ('00000000-0000-4000-8000-000000000323', 'kue', 'アラ'),
  ('00000000-0000-4000-8000-000000000324', 'hirame', 'オオクチ'),
  ('00000000-0000-4000-8000-000000000325', 'maaji', '豆アジ'),
  ('00000000-0000-4000-8000-000000000326', 'maaji', 'ゼンゴ'),
  ('00000000-0000-4000-8000-000000000327', 'buri', 'ワカナ'),
  ('00000000-0000-4000-8000-000000000328', 'madai', 'ホンダイ'),
  ('00000000-0000-4000-8000-000000000329', 'madai', 'ジャミ'),
  ('00000000-0000-4000-8000-000000000330', 'madai', 'タテコ')
) as seed(id, fish_species_id, alias_name)
on conflict (id) do update set
  fish_species_id = excluded.fish_species_id, alias_name = excluded.alias_name,
  match_key = excluded.match_key, approval_status = excluded.approval_status,
  is_active = excluded.is_active, approved_by = excluded.approved_by,
  approved_at = excluded.approved_at, updated_at = now();
