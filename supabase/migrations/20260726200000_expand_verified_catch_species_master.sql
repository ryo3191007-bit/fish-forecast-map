-- Issue #323: expand the fish species master for names confirmed in the 52-spot catch review.
-- Existing catches, fishing spots, SCORE v2 inputs, and RLS are intentionally not rewritten.

insert into public.fish_species
  (id, name_ja, category, season_months, display_order, is_active, entity_type, is_selectable, parent_group_id, ui_subgroup)
values
  ('karei','カレイ','category','{}',56,true,'species_group',true,null,null),
  ('megochi','メゴチ','category','{}',57,true,'species_group',true,null,null),
  ('aigo','アイゴ','fish','{}',58,true,'exact_species',true,null,null),
  ('haze','ハゼ','category','{}',59,true,'species_group',true,null,null),
  ('hirasuzuki','ヒラスズキ','fish','{}',60,true,'exact_species',true,null,null),
  ('katsuo','カツオ','fish','{}',61,true,'exact_species',true,null,null),
  ('eso','エソ','category','{}',62,true,'species_group',true,null,null),
  ('kyusen','キュウセン','fish','{}',63,true,'exact_species',true,null,null),
  ('kichinu','キチヌ','fish','{}',64,true,'exact_species',true,null,null),
  ('jindouika','ジンドウイカ','squid','{}',65,true,'squid_species',true,null,null),
  ('mutsu','ムツ','fish','{}',66,true,'exact_species',true,null,null),
  ('datsu','ダツ','fish','{}',67,true,'exact_species',true,null,null),
  ('houbou','ホウボウ','fish','{}',68,true,'exact_species',true,null,null),
  ('yagara','ヤガラ','category','{}',69,true,'species_group',true,null,null),
  ('yokofuedai','ヨコフエダイ','fish','{}',70,true,'exact_species',true,null,null),
  ('fuedai','フエダイ','fish','{}',71,true,'exact_species',true,null,null),
  ('anago','アナゴ','category','{}',72,true,'species_group',true,null,null)
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

with alias_seeds(alias_id, fish_species_id, alias_name) as (values
  ('00000000-0000-4000-8000-000000000600'::uuid,'karei','カレイ'),
  ('00000000-0000-4000-8000-000000000601'::uuid,'megochi','メゴチ'),
  ('00000000-0000-4000-8000-000000000602'::uuid,'aigo','アイゴ'),
  ('00000000-0000-4000-8000-000000000603'::uuid,'haze','ハゼ'),
  ('00000000-0000-4000-8000-000000000604'::uuid,'hirasuzuki','ヒラスズキ'),
  ('00000000-0000-4000-8000-000000000605'::uuid,'katsuo','カツオ'),
  ('00000000-0000-4000-8000-000000000606'::uuid,'eso','エソ'),
  ('00000000-0000-4000-8000-000000000607'::uuid,'kyusen','キュウセン'),
  ('00000000-0000-4000-8000-000000000608'::uuid,'kichinu','キチヌ'),
  ('00000000-0000-4000-8000-000000000609'::uuid,'jindouika','ジンドウイカ'),
  ('00000000-0000-4000-8000-000000000610'::uuid,'mutsu','ムツ'),
  ('00000000-0000-4000-8000-000000000611'::uuid,'datsu','ダツ'),
  ('00000000-0000-4000-8000-000000000612'::uuid,'houbou','ホウボウ'),
  ('00000000-0000-4000-8000-000000000613'::uuid,'yagara','ヤガラ'),
  ('00000000-0000-4000-8000-000000000614'::uuid,'yokofuedai','ヨコフエダイ'),
  ('00000000-0000-4000-8000-000000000615'::uuid,'fuedai','フエダイ'),
  ('00000000-0000-4000-8000-000000000616'::uuid,'anago','アナゴ'),
  ('00000000-0000-4000-8000-000000000617'::uuid,'aigo','バリ'),
  ('00000000-0000-4000-8000-000000000618'::uuid,'kyusen','ギザミ'),
  ('00000000-0000-4000-8000-000000000619'::uuid,'kichinu','キビレ'),
  ('00000000-0000-4000-8000-000000000620'::uuid,'jindouika','ヒイカ'),
  ('00000000-0000-4000-8000-000000000621'::uuid,'jindouika','コイカ'),
  ('00000000-0000-4000-8000-000000000622'::uuid,'madai','マダイ')
)
insert into public.fish_species_aliases
  (id, fish_species_id, alias_name, match_key, approval_status, is_active, approved_by, approved_at)
select
  alias_id,
  fish_species_id,
  alias_name,
  public.fish_species_match_key(alias_name),
  'approved',
  true,
  'migration:issue-323',
  now()
from alias_seeds
on conflict (id) do update set
  fish_species_id=excluded.fish_species_id,
  alias_name=excluded.alias_name,
  match_key=excluded.match_key,
  approval_status='approved',
  is_active=true,
  approved_by=excluded.approved_by,
  approved_at=excluded.approved_at,
  updated_at=now();
