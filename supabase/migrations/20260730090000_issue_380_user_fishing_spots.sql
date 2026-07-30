-- Issue #380: user-owned spots are deliberately isolated from the curated spot master.

create table public.user_fishing_spots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  latitude numeric not null check (latitude between -90 and 90),
  longitude numeric not null check (longitude between -180 and 180),
  area_name text null check (area_name is null or char_length(btrim(area_name)) between 1 and 120),
  spot_type text null check (spot_type is null or spot_type in ('漁港', '堤防', 'サーフ', '地磯', '磯場', '河口', '湾岸', 'その他')),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.user_fishing_spot_detail_values (
  id uuid primary key default gen_random_uuid(),
  user_spot_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_key text not null check (item_key in (
    'shore_access', 'toilet', 'lighting', 'parking', 'access', 'fishable_area', 'restriction_status',
    'depth', 'bottom_material', 'coastal_topography', 'obstacles', 'spot_features', 'tidal_flow',
    'river_influence', 'open_sea_bay_character'
  )),
  value_text text null,
  value_text_list text[] not null default '{}'::text[],
  value_number numeric null,
  unit text null,
  checked_at date not null,
  note text null check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_spot_detail_owner_fk foreign key (user_spot_id, owner_id)
    references public.user_fishing_spots(id, owner_id) on delete cascade,
  constraint user_spot_detail_one_value check (
    (case when nullif(btrim(value_text), '') is null then 0 else 1 end)
    + (case when cardinality(value_text_list) = 0 then 0 else 1 end)
    + (case when value_number is null then 0 else 1 end) = 1
  ),
  constraint user_spot_detail_depth check (
    (item_key = 'depth' and value_number between 0 and 1000 and unit = 'm')
    or (item_key <> 'depth' and value_number is null and unit is null)
  ),
  constraint user_spot_detail_value_shape check (
    (item_key = 'shore_access' and value_text = any (array['安定した足場を確認', '足場が不安定', '足場が滑りやすい']))
    or (item_key in ('toilet', 'lighting') and value_text = any (array['あり', 'なし']))
    or (item_key = 'parking' and value_text = any (array['駐車スペースを確認', '駐車スペースを確認できず']))
    or (item_key = 'access' and value_text is not null and char_length(btrim(value_text)) between 1 and 300)
    or (item_key = 'fishable_area' and cardinality(value_text_list) > 0 and value_text_list <@ array['釣り人の利用を確認', '柵・封鎖を確認']::text[])
    or (item_key = 'restriction_status' and cardinality(value_text_list) > 0 and value_text_list <@ array['立入禁止看板', '釣り禁止看板', '工事', '通行止め', '柵・封鎖', 'その他の規制・注意表示']::text[])
    or (item_key = 'depth' and value_number is not null)
    or (item_key = 'bottom_material' and cardinality(value_text_list) > 0 and value_text_list <@ array['砂', '砂泥', '泥', '岩', '藻場', 'その他']::text[])
    or (item_key = 'coastal_topography' and cardinality(value_text_list) > 0 and value_text_list <@ array['砂浜', '磯', '河口', '湾奥', 'かけ上がり', '浅場', '深場', 'その他']::text[])
    or (item_key = 'obstacles' and cardinality(value_text_list) > 0 and value_text_list <@ array['テトラ', '根', '岩礁', '構造物', 'その他']::text[])
    or (item_key = 'spot_features' and cardinality(value_text_list) > 0 and value_text_list <@ array['堤防', '岸壁', '護岸', 'テトラ', '磯', '砂浜', 'その他']::text[])
    or (item_key = 'tidal_flow' and value_text = any (array['強い', '普通', '弱い']))
    or (item_key = 'river_influence' and value_text = any (array['影響あり', '影響が弱い', '見当たらない']))
    or (item_key = 'open_sea_bay_character' and value_text = any (array['外海', '湾口', '湾内', '内湾']))
  ),
  unique (user_spot_id, item_key)
);

create or replace function public.set_user_fishing_spot_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger set_user_fishing_spots_updated_at before update on public.user_fishing_spots
for each row execute function public.set_user_fishing_spot_updated_at();
create trigger set_user_fishing_spot_details_updated_at before update on public.user_fishing_spot_detail_values
for each row execute function public.set_user_fishing_spot_updated_at();

alter table public.user_fishing_spots enable row level security;
alter table public.user_fishing_spot_detail_values enable row level security;

create policy user_fishing_spots_owner_select on public.user_fishing_spots for select to authenticated using (owner_id = auth.uid());
create policy user_fishing_spots_owner_insert on public.user_fishing_spots for insert to authenticated with check (owner_id = auth.uid());
create policy user_fishing_spots_owner_update on public.user_fishing_spots for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy user_fishing_spots_owner_delete on public.user_fishing_spots for delete to authenticated using (owner_id = auth.uid());

create policy user_spot_details_owner_select on public.user_fishing_spot_detail_values for select to authenticated using (owner_id = auth.uid());
create policy user_spot_details_owner_insert on public.user_fishing_spot_detail_values for insert to authenticated with check (owner_id = auth.uid());
create policy user_spot_details_owner_update on public.user_fishing_spot_detail_values for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy user_spot_details_owner_delete on public.user_fishing_spot_detail_values for delete to authenticated using (owner_id = auth.uid());

revoke all on public.user_fishing_spots from anon;
revoke all on public.user_fishing_spot_detail_values from anon;
grant select, insert, update, delete on public.user_fishing_spots to authenticated;
grant select, insert, update, delete on public.user_fishing_spot_detail_values to authenticated;
revoke all on function public.set_user_fishing_spot_updated_at() from public;

-- Recovery: these two new tables and their trigger function can be dropped if the feature is rolled back.
-- No existing fishing_spots, fishing_spot_detail_values, external_catch_memos, or JMA rows are modified.
