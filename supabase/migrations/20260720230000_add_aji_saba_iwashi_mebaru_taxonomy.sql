-- Issue #222: distinguish selectable common-name groups from exact species.
-- Existing catch and spot values are intentionally not rewritten.
update public.fish_species
set entity_type = 'species_group', is_selectable = true, updated_at = now()
where id in ('aji', 'saba', 'iwashi');

insert into public.fish_species
  (id, name_ja, category, season_months, display_order, is_active, entity_type, is_selectable, parent_group_id, ui_subgroup)
values
  ('maaji','マアジ','fish','{}',44,true,'exact_species',true,'aji',null),
  ('maruaji','マルアジ','fish','{}',45,true,'exact_species',true,'aji',null),
  ('masaba','マサバ','fish','{}',46,true,'exact_species',true,'saba',null),
  ('gomasaba','ゴマサバ','fish','{}',47,true,'exact_species',true,'saba',null),
  ('maiwashi','マイワシ','fish','{}',48,true,'exact_species',true,'iwashi',null),
  ('katakuchiiwashi','カタクチイワシ','fish','{}',49,true,'exact_species',true,'iwashi',null),
  ('urumeiwashi','ウルメイワシ','fish','{}',50,true,'exact_species',true,'iwashi',null),
  ('mebaru','メバル','category','{}',51,true,'species_group',true,'rockfish',null),
  ('akamebaru','アカメバル','fish','{}',52,true,'exact_species',true,'mebaru',null),
  ('kuromebaru','クロメバル','fish','{}',53,true,'exact_species',true,'mebaru',null),
  ('shiromebaru','シロメバル','fish','{}',54,true,'exact_species',true,'mebaru',null)
on conflict (id) do update set
  name_ja=excluded.name_ja, category=excluded.category, display_order=excluded.display_order,
  is_active=excluded.is_active, entity_type=excluded.entity_type, is_selectable=excluded.is_selectable,
  parent_group_id=excluded.parent_group_id, ui_subgroup=excluded.ui_subgroup, updated_at=now();

with seeds(alias_id, species_id) as (values
 ('00000000-0000-4000-8000-000000000400'::uuid,'maaji'),('00000000-0000-4000-8000-000000000401'::uuid,'maruaji'),
 ('00000000-0000-4000-8000-000000000402'::uuid,'masaba'),('00000000-0000-4000-8000-000000000403'::uuid,'gomasaba'),
 ('00000000-0000-4000-8000-000000000404'::uuid,'maiwashi'),('00000000-0000-4000-8000-000000000405'::uuid,'katakuchiiwashi'),
 ('00000000-0000-4000-8000-000000000406'::uuid,'urumeiwashi'),('00000000-0000-4000-8000-000000000407'::uuid,'mebaru'),
 ('00000000-0000-4000-8000-000000000408'::uuid,'akamebaru'),('00000000-0000-4000-8000-000000000409'::uuid,'kuromebaru'),
 ('00000000-0000-4000-8000-000000000410'::uuid,'shiromebaru')
)
insert into public.fish_species_aliases
  (id, fish_species_id, alias_name, match_key, approval_status, is_active, approved_by, approved_at)
select alias_id, species.id, species.name_ja, public.fish_species_match_key(species.name_ja),
  'approved', true, 'migration:issue-222', now()
from seeds join public.fish_species species on species.id = seeds.species_id
on conflict (id) do update set fish_species_id=excluded.fish_species_id, alias_name=excluded.alias_name,
  match_key=excluded.match_key, approval_status='approved', is_active=true, updated_at=now();
