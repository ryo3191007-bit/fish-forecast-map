-- Issue #381 review: create an owner spot and all optional detail rows in one transaction.
create or replace function public.create_my_user_fishing_spot_with_details(
  p_spot_id uuid, p_name text, p_latitude numeric, p_longitude numeric, p_area_name text default null,
  p_spot_type text default null, p_details jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_spot_id uuid; v_detail jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_details) <> 'array' then raise exception 'details must be an array'; end if;
  insert into public.user_fishing_spots (id, owner_id, name, latitude, longitude, area_name, spot_type)
  values (p_spot_id, v_user_id, p_name, p_latitude, p_longitude, p_area_name, p_spot_type)
  on conflict (id) do update set name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude,
    area_name = excluded.area_name, spot_type = excluded.spot_type
  where user_fishing_spots.owner_id = v_user_id
  returning id into v_spot_id;
  if v_spot_id is null then raise exception 'spot owner mismatch'; end if;
  delete from public.user_fishing_spot_detail_values where user_spot_id = v_spot_id and owner_id = v_user_id;
  for v_detail in select value from jsonb_array_elements(p_details) loop
    insert into public.user_fishing_spot_detail_values
      (user_spot_id, owner_id, item_key, value_text, value_text_list, value_number, unit, checked_at, note)
    values (v_spot_id, v_user_id, v_detail->>'item_key', nullif(v_detail->>'value_text', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(v_detail->'value_text_list', '[]'::jsonb))), '{}'::text[]),
      nullif(v_detail->>'value_number', '')::numeric, nullif(v_detail->>'unit', ''),
      (v_detail->>'checked_at')::date, nullif(v_detail->>'note', ''));
  end loop;
  return v_spot_id;
end;
$$;
revoke all on function public.create_my_user_fishing_spot_with_details(uuid, text, numeric, numeric, text, text, jsonb) from public;
grant execute on function public.create_my_user_fishing_spot_with_details(uuid, text, numeric, numeric, text, text, jsonb) to authenticated;
-- Recovery: drop only this function. Existing owner spots and the #380 tables are unchanged.
