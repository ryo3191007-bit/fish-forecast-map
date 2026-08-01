-- Issue #395: append-only owner field-report history while retaining the current-value snapshot.
create table public.user_fishing_spot_field_reports (
  id uuid primary key default gen_random_uuid(),
  user_spot_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  observed_on date not null,
  summary_note text null check (summary_note is null or char_length(summary_note) <= 1000),
  origin text not null default 'user' check (origin in ('user', 'initial_details', 'snapshot_backfill')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  constraint field_report_spot_owner_fk foreign key (user_spot_id, owner_id)
    references public.user_fishing_spots(id, owner_id) on delete cascade
);

create table public.user_fishing_spot_field_report_values (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
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
  note text null check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  constraint field_report_value_owner_fk foreign key (report_id, owner_id)
    references public.user_fishing_spot_field_reports(id, owner_id) on delete cascade,
  constraint field_report_value_one_value check (
    (case when nullif(btrim(value_text), '') is null then 0 else 1 end)
    + (case when cardinality(value_text_list) = 0 then 0 else 1 end)
    + (case when value_number is null then 0 else 1 end) = 1
  ),
  constraint field_report_value_depth check (
    (item_key = 'depth' and value_number between 0 and 1000 and unit = 'm')
    or (item_key <> 'depth' and value_number is null and unit is null)
  ),
  constraint field_report_value_shape check (
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
  unique (report_id, item_key)
);

create index field_reports_spot_order_idx on public.user_fishing_spot_field_reports
  (user_spot_id, observed_on desc, created_at desc);

create trigger set_user_fishing_spot_field_reports_updated_at before update on public.user_fishing_spot_field_reports
for each row execute function public.set_user_fishing_spot_updated_at();

alter table public.user_fishing_spot_field_reports enable row level security;
alter table public.user_fishing_spot_field_report_values enable row level security;
create policy field_reports_owner_all on public.user_fishing_spot_field_reports for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy field_report_values_owner_all on public.user_fishing_spot_field_report_values for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke all on public.user_fishing_spot_field_reports from anon;
revoke all on public.user_fishing_spot_field_report_values from anon;
grant select, insert, update, delete on public.user_fishing_spot_field_reports to authenticated;
grant select, insert, update, delete on public.user_fishing_spot_field_report_values to authenticated;

-- The old model cannot distinguish two visits on one day, so group only by its known keys.
insert into public.user_fishing_spot_field_reports (user_spot_id, owner_id, observed_on, origin, created_at, updated_at)
select user_spot_id, owner_id, checked_at, 'snapshot_backfill', min(created_at), max(updated_at)
from public.user_fishing_spot_detail_values group by user_spot_id, owner_id, checked_at;
insert into public.user_fishing_spot_field_report_values
  (report_id, owner_id, item_key, value_text, value_text_list, value_number, unit, note, created_at)
select r.id, d.owner_id, d.item_key, d.value_text, d.value_text_list, d.value_number, d.unit, d.note, d.created_at
from public.user_fishing_spot_detail_values d
join public.user_fishing_spot_field_reports r on r.user_spot_id = d.user_spot_id and r.owner_id = d.owner_id
  and r.observed_on = d.checked_at and r.origin = 'snapshot_backfill';

create or replace function public.save_my_user_fishing_spot_field_report(
  p_user_spot_id uuid, p_observed_on date, p_summary_note text default null,
  p_values jsonb default '[]'::jsonb, p_origin text default 'user'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_report_id uuid; v_value jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_origin not in ('user', 'initial_details') then raise exception 'invalid origin'; end if;
  if jsonb_typeof(p_values) <> 'array' or jsonb_array_length(p_values) = 0 then raise exception 'values must be a non-empty array'; end if;
  if exists (select 1 from jsonb_array_elements(p_values) v group by v->>'item_key' having count(*) > 1) then raise exception 'duplicate item_key'; end if;
  if not exists (select 1 from public.user_fishing_spots where id = p_user_spot_id and owner_id = v_user_id and not is_deleted) then raise exception 'spot owner mismatch'; end if;
  insert into public.user_fishing_spot_field_reports (user_spot_id, owner_id, observed_on, summary_note, origin)
  values (p_user_spot_id, v_user_id, p_observed_on, nullif(btrim(p_summary_note), ''), p_origin) returning id into v_report_id;
  for v_value in select value from jsonb_array_elements(p_values) loop
    insert into public.user_fishing_spot_field_report_values
      (report_id, owner_id, item_key, value_text, value_text_list, value_number, unit, note)
    values (v_report_id, v_user_id, v_value->>'item_key', nullif(v_value->>'value_text', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(v_value->'value_text_list', '[]'::jsonb))), '{}'::text[]),
      nullif(v_value->>'value_number', '')::numeric, nullif(v_value->>'unit', ''), nullif(v_value->>'note', ''));
    insert into public.user_fishing_spot_detail_values
      (user_spot_id, owner_id, item_key, value_text, value_text_list, value_number, unit, checked_at, note)
    values (p_user_spot_id, v_user_id, v_value->>'item_key', nullif(v_value->>'value_text', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(v_value->'value_text_list', '[]'::jsonb))), '{}'::text[]),
      nullif(v_value->>'value_number', '')::numeric, nullif(v_value->>'unit', ''), p_observed_on, nullif(v_value->>'note', ''))
    on conflict (user_spot_id, item_key) do update set value_text = excluded.value_text,
      value_text_list = excluded.value_text_list, value_number = excluded.value_number, unit = excluded.unit,
      checked_at = excluded.checked_at, note = excluded.note;
  end loop;
  return v_report_id;
end;
$$;
revoke all on function public.save_my_user_fishing_spot_field_report(uuid, date, text, jsonb, text) from public;
grant execute on function public.save_my_user_fishing_spot_field_report(uuid, date, text, jsonb, text) to authenticated;

-- Preserve the existing signature/fallback while adding initial details to history atomically.
create or replace function public.create_my_user_fishing_spot_with_details(
  p_spot_id uuid, p_name text, p_latitude numeric, p_longitude numeric, p_area_name text default null,
  p_spot_type text default null, p_details jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_spot_id uuid; v_observed_on date;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_details) <> 'array' then raise exception 'details must be an array'; end if;
  if exists (select 1 from jsonb_array_elements(p_details) v group by v->>'item_key' having count(*) > 1) then raise exception 'duplicate item_key'; end if;
  insert into public.user_fishing_spots (id, owner_id, name, latitude, longitude, area_name, spot_type)
  values (p_spot_id, v_user_id, p_name, p_latitude, p_longitude, p_area_name, p_spot_type)
  on conflict (id) do update set name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude,
    area_name = excluded.area_name, spot_type = excluded.spot_type where user_fishing_spots.owner_id = v_user_id
  returning id into v_spot_id;
  if v_spot_id is null then raise exception 'spot owner mismatch'; end if;
  delete from public.user_fishing_spot_detail_values where user_spot_id = v_spot_id and owner_id = v_user_id;
  if jsonb_array_length(p_details) > 0 then
    select (value->>'checked_at')::date into v_observed_on from jsonb_array_elements(p_details) limit 1;
    perform public.save_my_user_fishing_spot_field_report(v_spot_id, v_observed_on, null, p_details, 'initial_details');
  end if;
  return v_spot_id;
end;
$$;
revoke all on function public.create_my_user_fishing_spot_with_details(uuid, text, numeric, numeric, text, text, jsonb) from public;
grant execute on function public.create_my_user_fishing_spot_with_details(uuid, text, numeric, numeric, text, text, jsonb) to authenticated;

-- Recovery: drop the two new tables and report RPC, then restore the prior create RPC definition.
-- Snapshot rows are intentionally not removed or rewritten by rollback.
