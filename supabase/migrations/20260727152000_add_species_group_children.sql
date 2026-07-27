-- Issue #333: add exact-species children for previously generic-only groups.
-- Existing catches, fishing spots, SCORE v2 inputs, alias routing for kamasu, and RLS are intentionally not rewritten.

insert into public.fish_species
  (id, name_ja, category, season_months, display_order, is_active, entity_type, is_selectable, parent_group_id, ui_subgroup)
values
  ('makogarei','マコガレイ','fish','{}',73,true,'exact_species',false,'karei',null),
  ('nezumigochi','ネズミゴチ','fish','{}',74,true,'exact_species',false,'megochi',null),
  ('mahaze','マハゼ','fish','{}',75,true,'exact_species',false,'haze',null),
  ('urohaze','ウロハゼ','fish','{}',76,true,'exact_species',false,'haze',null),
  ('maeso','マエソ','fish','{}',77,true,'exact_species',false,'eso',null),
  ('wanieso','ワニエソ','fish','{}',78,true,'exact_species',false,'eso',null),
  ('tokageeso','トカゲエソ','fish','{}',79,true,'exact_species',false,'eso',null),
  ('akayagara','アカヤガラ','fish','{}',80,true,'exact_species',false,'yagara',null),
  ('aoyagara','アオヤガラ','fish','{}',81,true,'exact_species',false,'yagara',null)
on conflict (id) do update set
  name_ja=excluded.name_ja,
  category=excluded.category,
  display_order=excluded.display_order,
  is_active=excluded.is_active,
  entity_type=excluded.entity_type,
  is_selectable=excluded.is_selectable,
  parent_group_id=excluded.parent_group_id,
  ui_subgroup=excluded.ui_subgroup,
  updated_at=now();

-- Re-enable the existing exact kamasu IDs for research/taxonomy while keeping them
-- unavailable in normal selection UI. Their approved Japanese-name aliases continue
-- to resolve to the generic kamasu group by design.
update public.fish_species
set is_active = true, is_selectable = false, parent_group_id = 'kamasu', updated_at = now()
where id in ('akakamasu', 'yamatokamasu');

-- Generic アナゴ remains a group. Existing マアナゴ becomes its exact child;
-- no historical generic catch is rewritten or guessed to be マアナゴ.
update public.fish_species
set parent_group_id = 'anago', updated_at = now()
where id = 'maanago';

with seeds(alias_id, species_id) as (values
  ('00000000-0000-4000-8000-000000000700'::uuid,'makogarei'),
  ('00000000-0000-4000-8000-000000000701'::uuid,'nezumigochi'),
  ('00000000-0000-4000-8000-000000000702'::uuid,'mahaze'),
  ('00000000-0000-4000-8000-000000000703'::uuid,'urohaze'),
  ('00000000-0000-4000-8000-000000000704'::uuid,'maeso'),
  ('00000000-0000-4000-8000-000000000705'::uuid,'wanieso'),
  ('00000000-0000-4000-8000-000000000706'::uuid,'tokageeso'),
  ('00000000-0000-4000-8000-000000000707'::uuid,'akayagara'),
  ('00000000-0000-4000-8000-000000000708'::uuid,'aoyagara')
)
insert into public.fish_species_aliases
  (id, fish_species_id, alias_name, match_key, approval_status, is_active, approved_by, approved_at)
select
  seeds.alias_id,
  species.id,
  species.name_ja,
  public.fish_species_match_key(species.name_ja),
  'approved',
  true,
  'migration:issue-333',
  now()
from seeds
join public.fish_species species on species.id = seeds.species_id
on conflict (id) do update set
  fish_species_id=excluded.fish_species_id,
  alias_name=excluded.alias_name,
  match_key=excluded.match_key,
  approval_status='approved',
  is_active=true,
  approved_by=excluded.approved_by,
  approved_at=excluded.approved_at,
  updated_at=now();