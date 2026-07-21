-- Issue #220 follow-up: normalize unambiguous regional names without adding
-- regional, growth-stage, or alias-type schema.
update public.fish_species
set name_ja = 'スズキ', updated_at = now()
where id = 'seabass';

-- Free the canonical name before assigning it to kensakiika. The unique
-- fish_species.name_ja constraint makes this ordering significant on a fresh DB.
update public.fish_species
set name_ja = 'ヤリイカ（旧分類）', is_active = false, is_selectable = false, updated_at = now()
where id = 'yariika';

update public.fish_species
set name_ja = 'ヤリイカ', is_active = true, is_selectable = true, updated_at = now()
where id = 'kensakiika';

-- Add the selectable group without replacing the legacy species IDs used by
-- existing catches, spots, or score records.
insert into public.fish_species
  (id, name_ja, category, season_months, display_order, is_active, entity_type, is_selectable, parent_group_id, ui_subgroup)
values
  ('kamasu', 'カマス', 'category', '{}', 42, true, 'species_group', true, null, null)
on conflict (id) do update set
  name_ja = excluded.name_ja, category = excluded.category,
  is_active = excluded.is_active, entity_type = excluded.entity_type,
  is_selectable = excluded.is_selectable, parent_group_id = excluded.parent_group_id,
  ui_subgroup = excluded.ui_subgroup, updated_at = now();

-- Keep the individual IDs for foreign-key compatibility, but route normal UI
-- selection through the new group only.
update public.fish_species
set parent_group_id = 'kamasu', is_active = false, is_selectable = false, updated_at = now()
where id in ('akakamasu', 'yamatokamasu');

-- The original canonical ヤリイカ alias is retained and reassigned rather
-- than deleted, so existing alias references and deterministic IDs survive.
update public.fish_species_aliases
set fish_species_id = 'kensakiika', approval_status = 'approved', is_active = true,
  approved_by = 'migration:issue-220-regional-simplification', approved_at = now(), updated_at = now()
where match_key = public.fish_species_match_key('ヤリイカ');

-- Reuse the existing canonical alias rows so their deterministic IDs remain
-- stable while both individual names resolve to the selectable group.
update public.fish_species_aliases
set fish_species_id = 'kamasu', approval_status = 'approved', is_active = true,
  approved_by = 'migration:issue-226-regional-simplification', approved_at = now(), updated_at = now()
where match_key in (
  public.fish_species_match_key('アカカマス'),
  public.fish_species_match_key('ヤマトカマス')
);

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
  ('00000000-0000-4000-8000-000000000330', 'madai', 'タテコ'),
  ('00000000-0000-4000-8000-000000000331', 'kawahagi', 'ハゲ'),
  ('00000000-0000-4000-8000-000000000332', 'kawahagi', 'ハギ'),
  ('00000000-0000-4000-8000-000000000333', 'kamasu', 'カマス'),
  ('00000000-0000-4000-8000-000000000335', 'kouika', 'モンゴウイカ'),
  ('00000000-0000-4000-8000-000000000336', 'kouika', 'カミナリイカ')
) as seed(id, fish_species_id, alias_name)
on conflict (id) do update set
  fish_species_id = excluded.fish_species_id, alias_name = excluded.alias_name,
  match_key = excluded.match_key, approval_status = excluded.approval_status,
  is_active = excluded.is_active, approved_by = excluded.approved_by,
  approved_at = excluded.approved_at, updated_at = now();
