-- Issue #306: owner-scoped field observations for fishing spot detail tabs.
-- User observations stay pending/candidate and never enter the adopted curated read path.

create or replace function public.get_my_spot_observations(p_spot_id text)
returns table (
  id uuid,
  spot_id text,
  item_key text,
  information_state text,
  value_text text,
  value_text_list text[],
  value_number numeric,
  unit text,
  checked_at date,
  note text,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    value.id,
    value.spot_id,
    value.item_key,
    value.information_state,
    value.value_text,
    value.value_text_list,
    value.value_number,
    value.unit,
    value.checked_at,
    value.note,
    value.updated_at
  from public.fishing_spot_detail_values value
  where auth.uid() is not null
    and value.contributor_id = auth.uid()
    and value.contribution_origin = 'user_contribution'
    and value.moderation_status = 'pending'
    and value.review_status = 'pending_review'
    and value.adoption_status = 'candidate'
    and value.spot_id = p_spot_id
  order by value.updated_at desc;
$$;

create or replace function public.save_my_spot_observation(
  p_spot_id text,
  p_item_key text,
  p_information_state text,
  p_value_text text default null,
  p_value_text_list text[] default '{}'::text[],
  p_value_number numeric default null,
  p_unit text default null,
  p_checked_at date default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_observation_id uuid;
  v_value_count integer;
  v_today_jst date := (current_timestamp at time zone 'Asia/Tokyo')::date;
  v_trimmed_text text := nullif(btrim(coalesce(p_value_text, '')), '');
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_list text[] := coalesce(p_value_text_list, '{}'::text[]);
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_spot_id is null or not exists (select 1 from public.fishing_spots where id = p_spot_id and is_active = true) then
    raise exception 'invalid fishing spot';
  end if;
  if p_item_key is null or p_item_key <> all (array[
    'target_species', 'shore_access', 'toilet', 'lighting', 'parking', 'access',
    'fishable_area', 'restriction_status', 'depth', 'bottom_material',
    'coastal_topography', 'obstacles', 'spot_features', 'tidal_flow',
    'river_influence', 'open_sea_bay_character'
  ]::text[]) then
    raise exception 'item is not editable as a field observation';
  end if;
  if not exists (select 1 from public.fishing_spot_detail_item_definitions where item_key = p_item_key and is_active = true) then
    raise exception 'inactive or unknown item';
  end if;
  if p_information_state not in ('weak_evidence', 'researched_unknown') then
    raise exception 'invalid information state';
  end if;
  if p_checked_at is null or p_checked_at > v_today_jst or p_checked_at < date '1900-01-01' then
    raise exception 'invalid checked date';
  end if;
  if v_note is not null and char_length(v_note) > 1000 then
    raise exception 'note too long';
  end if;
  if cardinality(v_list) > 20 or array_position(v_list, null::text) is not null then
    raise exception 'invalid list value';
  end if;
  if exists (select 1 from unnest(v_list) item where btrim(item) = '' or char_length(item) > 80) then
    raise exception 'invalid list item';
  end if;
  if cardinality(v_list) <> (select count(distinct item) from unnest(v_list) item) then
    raise exception 'duplicate list item';
  end if;

  v_value_count :=
    (case when v_trimmed_text is not null then 1 else 0 end)
    + (case when cardinality(v_list) > 0 then 1 else 0 end)
    + (case when p_value_number is not null then 1 else 0 end);

  if p_information_state = 'researched_unknown' then
    if v_value_count <> 0 or p_unit is not null then
      raise exception 'unknown observation must not contain a value';
    end if;
  elsif v_value_count <> 1 then
    raise exception 'field observation must contain exactly one value';
  end if;

  if p_information_state = 'weak_evidence' then
    if p_item_key <> 'depth' and p_unit is not null then
      raise exception 'unit is only supported for depth observations';
    end if;

    case p_item_key
      when 'target_species' then
        if cardinality(v_list) = 0 or exists (
          select 1 from unnest(v_list) submitted(name)
          where not exists (
            select 1 from public.fish_species species
            where species.name_ja = submitted.name and species.is_active = true and species.is_selectable = true
          )
        ) then raise exception 'invalid target species'; end if;
      when 'shore_access' then
        if v_trimmed_text is null or v_trimmed_text <> all (array['安定した足場を確認', '足場が不安定', '足場が滑りやすい']::text[]) then raise exception 'invalid shore access observation'; end if;
      when 'toilet' then
        if v_trimmed_text is null or v_trimmed_text <> all (array['あり', 'なし']::text[]) then raise exception 'invalid toilet observation'; end if;
      when 'lighting' then
        if v_trimmed_text is null or v_trimmed_text <> all (array['あり', 'なし']::text[]) then raise exception 'invalid lighting observation'; end if;
      when 'parking' then
        if v_trimmed_text is null or v_trimmed_text <> all (array['駐車スペースを確認', '駐車スペースを確認できず']::text[]) then raise exception 'invalid parking observation'; end if;
      when 'access' then
        if v_trimmed_text is null or char_length(v_trimmed_text) > 300 then raise exception 'invalid access observation'; end if;
      when 'fishable_area' then
        if cardinality(v_list) = 0 or not (v_list <@ array['釣り人の利用を確認', '柵・封鎖を確認']::text[]) then raise exception 'invalid fishable area observation'; end if;
      when 'restriction_status' then
        if cardinality(v_list) = 0 or not (v_list <@ array['立入禁止看板', '釣り禁止看板', '工事', '通行止め', '柵・封鎖', 'その他の規制・注意表示']::text[]) then raise exception 'invalid restriction observation'; end if;
      when 'depth' then
        if p_value_number is null or p_value_number < 0 or p_value_number > 1000 or p_unit <> 'm' then raise exception 'invalid depth observation'; end if;
      when 'bottom_material' then
        if cardinality(v_list) = 0 or not (v_list <@ array['砂', '砂泥', '泥', '岩', '藻場', 'その他']::text[]) then raise exception 'invalid bottom material observation'; end if;
      when 'coastal_topography' then
        if cardinality(v_list) = 0 or not (v_list <@ array['砂浜', '磯', '河口', '湾奥', 'かけ上がり', '浅場', '深場', 'その他']::text[]) then raise exception 'invalid coastal topography observation'; end if;
      when 'obstacles' then
        if cardinality(v_list) = 0 or not (v_list <@ array['テトラ', '根', '岩礁', '構造物', 'その他']::text[]) then raise exception 'invalid obstacles observation'; end if;
      when 'spot_features' then
        if cardinality(v_list) = 0 or not (v_list <@ array['堤防', '岸壁', '護岸', 'テトラ', '磯', '砂浜', 'その他']::text[]) then raise exception 'invalid spot features observation'; end if;
      when 'tidal_flow' then
        if v_trimmed_text is null or v_trimmed_text <> all (array['強い', '普通', '弱い']::text[]) then raise exception 'invalid tidal flow observation'; end if;
      when 'river_influence' then
        if v_trimmed_text is null or v_trimmed_text <> all (array['影響あり', '影響が弱い', '見当たらない']::text[]) then raise exception 'invalid river influence observation'; end if;
      when 'open_sea_bay_character' then
        if v_trimmed_text is null or v_trimmed_text <> all (array['外海', '湾口', '湾内', '内湾']::text[]) then raise exception 'invalid sea character observation'; end if;
      else
        raise exception 'unsupported item';
    end case;
  end if;

  delete from public.fishing_spot_detail_values
  where spot_id = p_spot_id
    and item_key = p_item_key
    and contributor_id = v_user_id
    and contribution_origin = 'user_contribution'
    and moderation_status = 'pending'
    and review_status = 'pending_review'
    and adoption_status = 'candidate';

  insert into public.fishing_spot_detail_values (
    spot_id, item_key, information_state, value_text, value_text_list, value_number,
    unit, confidence, contribution_origin, contributor_id, submitted_at,
    moderation_status, review_status, adoption_status, note, checked_at
  ) values (
    p_spot_id,
    p_item_key,
    p_information_state,
    case when p_information_state = 'weak_evidence' then v_trimmed_text else null end,
    case when p_information_state = 'weak_evidence' then v_list else '{}'::text[] end,
    case when p_information_state = 'weak_evidence' then p_value_number else null end,
    case when p_information_state = 'weak_evidence' then p_unit else null end,
    case when p_information_state = 'weak_evidence' then 'low' else null end,
    'user_contribution',
    v_user_id,
    now(),
    'pending',
    'pending_review',
    'candidate',
    v_note,
    p_checked_at
  ) returning id into v_observation_id;

  return v_observation_id;
end;
$$;

create or replace function public.delete_my_spot_observation(p_observation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  delete from public.fishing_spot_detail_values
  where id = p_observation_id
    and contributor_id = v_user_id
    and contribution_origin = 'user_contribution'
    and moderation_status = 'pending'
    and review_status = 'pending_review'
    and adoption_status = 'candidate';

  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

revoke all on function public.get_my_spot_observations(text) from public;
revoke all on function public.save_my_spot_observation(text, text, text, text, text[], numeric, text, date, text) from public;
revoke all on function public.delete_my_spot_observation(uuid) from public;

grant execute on function public.get_my_spot_observations(text) to authenticated;
grant execute on function public.save_my_spot_observation(text, text, text, text, text[], numeric, text, date, text) to authenticated;
grant execute on function public.delete_my_spot_observation(uuid) to authenticated;
