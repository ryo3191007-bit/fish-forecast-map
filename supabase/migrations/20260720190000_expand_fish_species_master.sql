-- Issue #215: additive, forward-only expansion of the canonical species master.
-- A species has at most one navigation/filter parent in this first batch. A
-- membership table would add complexity without a current multi-group member.
alter table public.fish_species add column if not exists entity_type text not null default 'exact_species';
alter table public.fish_species add column if not exists is_selectable boolean not null default true;
alter table public.fish_species add column if not exists parent_group_id text references public.fish_species(id);
alter table public.fish_species add column if not exists ui_subgroup text;

alter table public.fish_species drop constraint if exists fish_species_entity_type_check;
alter table public.fish_species add constraint fish_species_entity_type_check check (entity_type in ('exact_species', 'species_group', 'squid_species', 'cephalopod_species'));
create index if not exists fish_species_parent_group_id_idx on public.fish_species(parent_group_id);

update public.fish_species set entity_type = case when id in ('aomono', 'rockfish') then 'species_group' when category = 'squid' then 'squid_species' else 'exact_species' end,
  is_selectable = id not in ('aomono', 'rockfish') where id in ('aji','saba','iwashi','aomono','shiira','hirame','magochi','seabass','aoriika','yariika','kouika','chinu','madai','kisu','rockfish');

insert into public.fish_species (id,name_ja,category,season_months,display_order,is_active,entity_type,is_selectable,parent_group_id,ui_subgroup) values
('buri','ブリ','fish','{}',16,true,'exact_species',true,'aomono',null),('hiramasa','ヒラマサ','fish','{}',17,true,'exact_species',true,'aomono',null),
('kanpachi','カンパチ','fish','{}',18,true,'exact_species',true,'aomono',null),('sawara','サワラ','fish','{}',19,true,'exact_species',true,'aomono',null),
('kasago','カサゴ','fish','{}',20,true,'exact_species',true,'rockfish',null),('oniokoze','オニオコゼ','fish','{}',21,true,'exact_species',true,'rockfish',null),
('kijihata','キジハタ','fish','{}',22,true,'exact_species',true,'rockfish','ハタ類'),('oomonhata','オオモンハタ','fish','{}',23,true,'exact_species',true,'rockfish','ハタ類'),
('akahata','アカハタ','fish','{}',24,true,'exact_species',true,'rockfish','ハタ類'),('mahata','マハタ','fish','{}',25,true,'exact_species',true,'rockfish','ハタ類'),
('aohata','アオハタ','fish','{}',26,true,'exact_species',true,'rockfish','ハタ類'),('kue','クエ','fish','{}',27,true,'exact_species',true,'rockfish','ハタ類'),
('kensakiika','ケンサキイカ','squid','{}',28,true,'squid_species',true,null,null),('surumeika','スルメイカ','squid','{}',29,true,'squid_species',true,null,null),
('madako','マダコ','fish','{}',30,true,'cephalopod_species',true,null,null),('isaki','イサキ','fish','{}',31,true,'exact_species',true,null,null),
('mejina','メジナ','fish','{}',32,true,'exact_species',true,null,null),('tachiuo','タチウオ','fish','{}',33,true,'exact_species',true,null,null),
('kawahagi','カワハギ','fish','{}',34,true,'exact_species',true,null,null),('umazurahagi','ウマヅラハギ','fish','{}',35,true,'exact_species',true,null,null),
('konoshiro','コノシロ','fish','{}',36,true,'exact_species',true,null,null),('sayori','サヨリ','fish','{}',37,true,'exact_species',true,null,null),
('bora','ボラ','fish','{}',38,true,'exact_species',true,null,null),('maanago','マアナゴ','fish','{}',39,true,'exact_species',true,null,null),
('ishidai','イシダイ','fish','{}',40,true,'exact_species',true,null,null),('ishigakidai','イシガキダイ','fish','{}',41,true,'exact_species',true,null,null),
('akakamasu','アカカマス','fish','{}',42,true,'exact_species',true,null,null),('yamatokamasu','ヤマトカマス','fish','{}',43,true,'exact_species',true,null,null)
on conflict(id) do update set name_ja=excluded.name_ja, category=excluded.category, display_order=excluded.display_order, is_active=excluded.is_active, entity_type=excluded.entity_type, is_selectable=excluded.is_selectable, parent_group_id=excluded.parent_group_id, ui_subgroup=excluded.ui_subgroup, updated_at=now();

insert into public.fish_species_aliases(id,fish_species_id,alias_name,match_key,approval_status,is_active,approved_by,approved_at)
select ('00000000-0000-4000-8000-' || lpad(display_order::text,12,'0'))::uuid,id,name_ja,public.fish_species_match_key(name_ja),'approved',true,'migration:issue-215',now()
from public.fish_species where display_order between 16 and 43
on conflict(id) do update set fish_species_id=excluded.fish_species_id,alias_name=excluded.alias_name,match_key=excluded.match_key,approval_status='approved',is_active=true,updated_at=now();
