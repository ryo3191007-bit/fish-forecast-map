-- Issue #395: append-only field reports shared by master and user-created spots.
create table public.spot_field_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('master', 'user')),
  spot_id text null references public.fishing_spots(id) on update cascade on delete cascade,
  user_spot_id uuid null,
  observed_on date not null,
  summary_note text null check (summary_note is null or char_length(summary_note) <= 1000),
  origin text not null default 'user' check (origin in ('user', 'initial_details', 'snapshot_backfill')),
  idempotency_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (owner_id, idempotency_key),
  constraint spot_field_reports_exact_target check (
    (target_type = 'master' and spot_id is not null and user_spot_id is null)
    or (target_type = 'user' and spot_id is null and user_spot_id is not null)
  ),
  constraint spot_field_reports_user_owner_fk foreign key (user_spot_id, owner_id)
    references public.user_fishing_spots(id, owner_id) on delete cascade
);

create table public.spot_field_report_values (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_key text not null check (item_key in (
    'target_species', 'shore_access', 'toilet', 'lighting', 'parking', 'access', 'fishable_area',
    'restriction_status', 'depth', 'bottom_material', 'coastal_topography', 'obstacles',
    'spot_features', 'tidal_flow', 'river_influence', 'open_sea_bay_character'
  )),
  information_state text not null default 'weak_evidence'
    check (information_state in ('weak_evidence', 'researched_unknown')),
  value_text text null,
  value_text_list text[] not null default '{}'::text[],
  value_number numeric null,
  unit text null,
  note text null check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  constraint spot_field_report_value_owner_fk foreign key (report_id, owner_id)
    references public.spot_field_reports(id, owner_id) on delete cascade,
  constraint spot_field_report_value_shape check (
    (information_state = 'researched_unknown' and nullif(btrim(value_text), '') is null
      and cardinality(value_text_list) = 0 and value_number is null and unit is null)
    or (information_state = 'weak_evidence' and
      (case when nullif(btrim(value_text), '') is null then 0 else 1 end)
      + (case when cardinality(value_text_list) = 0 then 0 else 1 end)
      + (case when value_number is null then 0 else 1 end) = 1)
  ),
  unique (report_id, item_key)
);

create index spot_field_reports_master_order_idx on public.spot_field_reports
  (spot_id, owner_id, observed_on desc, created_at desc) where target_type = 'master';
create index spot_field_reports_user_order_idx on public.spot_field_reports
  (user_spot_id, owner_id, observed_on desc, created_at desc) where target_type = 'user';
create trigger set_spot_field_reports_updated_at before update on public.spot_field_reports
for each row execute function public.set_user_fishing_spot_updated_at();

alter table public.spot_field_reports enable row level security;
alter table public.spot_field_report_values enable row level security;
create policy spot_field_reports_owner_all on public.spot_field_reports for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy spot_field_report_values_owner_all on public.spot_field_report_values for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke all on public.spot_field_reports from anon;
revoke all on public.spot_field_report_values from anon;
grant select, insert, update, delete on public.spot_field_reports to authenticated;
grant select, insert, update, delete on public.spot_field_report_values to authenticated;

-- Existing snapshots do not identify separate same-day visits. Backfill only the known grouping keys.
insert into public.spot_field_reports (owner_id, target_type, user_spot_id, observed_on, origin, created_at, updated_at)
select owner_id, 'user', user_spot_id, checked_at, 'snapshot_backfill', min(created_at), max(updated_at)
from public.user_fishing_spot_detail_values group by user_spot_id, owner_id, checked_at;
insert into public.spot_field_report_values
  (report_id, owner_id, item_key, information_state, value_text, value_text_list, value_number, unit, note, created_at)
select report.id, value.owner_id, value.item_key, 'weak_evidence', value.value_text, value.value_text_list,
  value.value_number, value.unit, value.note, value.created_at
from public.user_fishing_spot_detail_values value
join public.spot_field_reports report on report.user_spot_id = value.user_spot_id
  and report.owner_id = value.owner_id and report.observed_on = value.checked_at
  and report.origin = 'snapshot_backfill';

insert into public.spot_field_reports (owner_id, target_type, spot_id, observed_on, origin, created_at, updated_at)
select contributor_id, 'master', spot_id, checked_at, 'snapshot_backfill', min(created_at), max(updated_at)
from public.fishing_spot_detail_values
where contribution_origin = 'user_contribution' and moderation_status = 'pending'
  and review_status = 'pending_review' and adoption_status = 'candidate' and contributor_id is not null
group by spot_id, contributor_id, checked_at;
insert into public.spot_field_report_values
  (report_id, owner_id, item_key, information_state, value_text, value_text_list, value_number, unit, note, created_at)
select report.id, value.contributor_id, value.item_key, value.information_state, value.value_text,
  value.value_text_list, value.value_number, value.unit, value.note, value.created_at
from public.fishing_spot_detail_values value
join public.spot_field_reports report on report.spot_id = value.spot_id
  and report.owner_id = value.contributor_id and report.observed_on = value.checked_at
  and report.origin = 'snapshot_backfill'
where value.contribution_origin = 'user_contribution' and value.moderation_status = 'pending'
  and value.review_status = 'pending_review' and value.adoption_status = 'candidate';

create or replace function public.save_my_spot_field_report(
  p_target_type text, p_spot_id text default null, p_user_spot_id uuid default null,
  p_observed_on date default null, p_summary_note text default null,
  p_values jsonb default '[]'::jsonb, p_origin text default 'user', p_idempotency_key text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_report_id uuid; v_value jsonb; v_current_date date;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_target_type not in ('master', 'user') then raise exception 'invalid target type'; end if;
  if (p_target_type = 'master') <> (p_spot_id is not null and p_user_spot_id is null) then raise exception 'invalid target'; end if;
  if (p_target_type = 'user') <> (p_spot_id is null and p_user_spot_id is not null) then raise exception 'invalid target'; end if;
  if p_observed_on is null or p_observed_on > (current_timestamp at time zone 'Asia/Tokyo')::date then raise exception 'invalid observed date'; end if;
  if p_origin not in ('user', 'initial_details') then raise exception 'invalid origin'; end if;
  if jsonb_typeof(p_values) <> 'array' or jsonb_array_length(p_values) = 0 then raise exception 'values must be a non-empty array'; end if;
  if exists (select 1 from jsonb_array_elements(p_values) value group by value->>'item_key' having count(*) > 1) then raise exception 'duplicate item_key'; end if;
  if p_target_type = 'master' and not exists (select 1 from public.fishing_spots where id = p_spot_id and is_active) then raise exception 'invalid fishing spot'; end if;
  if p_target_type = 'user' and not exists (select 1 from public.user_fishing_spots where id = p_user_spot_id and owner_id = v_user_id and not is_deleted) then raise exception 'spot owner mismatch'; end if;

  insert into public.spot_field_reports
    (owner_id, target_type, spot_id, user_spot_id, observed_on, summary_note, origin, idempotency_key)
  values (v_user_id, p_target_type, p_spot_id, p_user_spot_id, p_observed_on,
    nullif(btrim(p_summary_note), ''), p_origin, nullif(p_idempotency_key, ''))
  on conflict (owner_id, idempotency_key) do nothing returning id into v_report_id;
  if v_report_id is null then
    select id into v_report_id from public.spot_field_reports
    where owner_id = v_user_id and idempotency_key = p_idempotency_key;
    return v_report_id;
  end if;

  for v_value in select value from jsonb_array_elements(p_values) loop
    insert into public.spot_field_report_values
      (report_id, owner_id, item_key, information_state, value_text, value_text_list, value_number, unit, note)
    values (v_report_id, v_user_id, v_value->>'item_key', coalesce(v_value->>'information_state', 'weak_evidence'),
      nullif(v_value->>'value_text', ''), coalesce(array(select jsonb_array_elements_text(coalesce(v_value->'value_text_list', '[]'::jsonb))), '{}'::text[]),
      nullif(v_value->>'value_number', '')::numeric, nullif(v_value->>'unit', ''), nullif(v_value->>'note', ''));

    if p_target_type = 'user' then
      select checked_at into v_current_date from public.user_fishing_spot_detail_values
      where user_spot_id = p_user_spot_id and owner_id = v_user_id and item_key = v_value->>'item_key';
      if v_current_date is null or p_observed_on >= v_current_date then
        insert into public.user_fishing_spot_detail_values
          (user_spot_id, owner_id, item_key, value_text, value_text_list, value_number, unit, checked_at, note)
        values (p_user_spot_id, v_user_id, v_value->>'item_key', nullif(v_value->>'value_text', ''),
          coalesce(array(select jsonb_array_elements_text(coalesce(v_value->'value_text_list', '[]'::jsonb))), '{}'::text[]),
          nullif(v_value->>'value_number', '')::numeric, nullif(v_value->>'unit', ''), p_observed_on, nullif(v_value->>'note', ''))
        on conflict (user_spot_id, item_key) do update set value_text = excluded.value_text,
          value_text_list = excluded.value_text_list, value_number = excluded.value_number, unit = excluded.unit,
          checked_at = excluded.checked_at, note = excluded.note
        where excluded.checked_at >= user_fishing_spot_detail_values.checked_at;
      end if;
    else
      select checked_at into v_current_date from public.fishing_spot_detail_values
      where spot_id = p_spot_id and item_key = v_value->>'item_key' and contributor_id = v_user_id
        and contribution_origin = 'user_contribution' and moderation_status = 'pending'
        and review_status = 'pending_review' and adoption_status = 'candidate';
      if v_current_date is null or p_observed_on >= v_current_date then
        perform public.save_my_spot_observation(p_spot_id, v_value->>'item_key',
          coalesce(v_value->>'information_state', 'weak_evidence'), nullif(v_value->>'value_text', ''),
          coalesce(array(select jsonb_array_elements_text(coalesce(v_value->'value_text_list', '[]'::jsonb))), '{}'::text[]),
          nullif(v_value->>'value_number', '')::numeric, nullif(v_value->>'unit', ''), p_observed_on, nullif(v_value->>'note', ''));
      end if;
    end if;
  end loop;
  return v_report_id;
end;
$$;
revoke all on function public.save_my_spot_field_report(text, text, uuid, date, text, jsonb, text, text) from public;
grant execute on function public.save_my_spot_field_report(text, text, uuid, date, text, jsonb, text, text) to authenticated;

-- Keep the established creationId (p_spot_id) retry contract and key each date group deterministically.
create or replace function public.create_my_user_fishing_spot_with_details(
  p_spot_id uuid, p_name text, p_latitude numeric, p_longitude numeric, p_area_name text default null,
  p_spot_type text default null, p_details jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_spot_id uuid; v_observed_on date; v_initial_values jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_details) <> 'array' then raise exception 'details must be an array'; end if;
  if exists (select 1 from jsonb_array_elements(p_details) value group by value->>'item_key' having count(*) > 1) then raise exception 'duplicate item_key'; end if;
  insert into public.user_fishing_spots (id, owner_id, name, latitude, longitude, area_name, spot_type)
  values (p_spot_id, v_user_id, p_name, p_latitude, p_longitude, p_area_name, p_spot_type)
  on conflict (id) do update set name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude,
    area_name = excluded.area_name, spot_type = excluded.spot_type where user_fishing_spots.owner_id = v_user_id
  returning id into v_spot_id;
  if v_spot_id is null then raise exception 'spot owner mismatch'; end if;
  if jsonb_array_length(p_details) > 0 then
    for v_observed_on in select distinct (value->>'checked_at')::date from jsonb_array_elements(p_details) order by 1 loop
      select jsonb_agg(value) into v_initial_values from jsonb_array_elements(p_details)
      where (value->>'checked_at')::date = v_observed_on;
      perform public.save_my_spot_field_report('user', null, v_spot_id, v_observed_on, null,
        v_initial_values, 'initial_details', 'initial_details:' || v_spot_id::text || ':' || v_observed_on::text);
    end loop;
  end if;
  return v_spot_id;
end;
$$;
revoke all on function public.create_my_user_fishing_spot_with_details(uuid, text, numeric, numeric, text, text, jsonb) from public;
grant execute on function public.create_my_user_fishing_spot_with_details(uuid, text, numeric, numeric, text, text, jsonb) to authenticated;

-- Recovery: drop the two report tables and save RPC, then restore the prior creation RPC.
-- Existing snapshot rows remain the source of current values and are never removed by this migration.
