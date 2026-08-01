-- Issue #396: private, owner-scoped photos for catches and field reports.
-- `public` was added to Storage at a different point in its schema history.  A
-- private bucket is the default, so do not make a fresh database depend on it.
insert into storage.buckets (id, name, file_size_limit, allowed_mime_types)
values ('private-record-photos', 'private-record-photos', 512000, array['image/webp'])
on conflict (id) do update set file_size_limit = 512000, allowed_mime_types = array['image/webp'];

alter table public.external_catch_memos
  add constraint external_catch_memos_id_owner_unique unique (id, owner_id);

create table public.record_photos (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('catch_memo', 'field_report')),
  catch_memo_id text,
  field_report_id uuid,
  storage_path text not null unique,
  sort_order smallint not null check (sort_order between 0 and 2),
  mime_type text not null check (mime_type = 'image/webp'),
  byte_size integer not null check (byte_size between 1 and 460800),
  width integer not null check (width between 1 and 1280),
  height integer not null check (height between 1 and 1280),
  created_at timestamptz not null default now(),
  constraint record_photos_exact_target check (
    (target_type = 'catch_memo' and catch_memo_id is not null and field_report_id is null) or
    (target_type = 'field_report' and catch_memo_id is null and field_report_id is not null)
  ),
  constraint record_photos_catch_owner_fk foreign key (catch_memo_id, owner_id)
    references public.external_catch_memos(id, owner_id) on delete cascade,
  constraint record_photos_report_owner_fk foreign key (field_report_id, owner_id)
    references public.spot_field_reports(id, owner_id) on delete cascade
);
create unique index record_photos_catch_order_unique on public.record_photos (catch_memo_id, sort_order) where target_type = 'catch_memo';
create unique index record_photos_report_order_unique on public.record_photos (field_report_id, sort_order) where target_type = 'field_report';
alter table public.record_photos enable row level security;
create policy record_photos_owner_select on public.record_photos for select to authenticated using (owner_id = auth.uid());
revoke all on public.record_photos from anon, authenticated;
grant select on public.record_photos to authenticated;

create or replace function public.can_write_my_record_photo_object(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_parts text[] := storage.foldername(p_name); v_target_id text;
begin
  if v_user_id is null or array_length(v_parts, 1) <> 3 or v_parts[1] <> v_user_id::text or
     v_parts[2] not in ('catch_memo', 'field_report') or p_name !~ '^[0-9a-f-]+/(catch_memo|field_report)/[^/]+/[0-9a-f-]+\.webp$' then return false; end if;
  v_target_id := v_parts[3];
  if v_parts[2] = 'catch_memo' then return exists (select 1 from public.external_catch_memos where id = v_target_id and owner_id = v_user_id and created_by = 'authenticated_user' and not is_deleted); end if;
  begin return exists (select 1 from public.spot_field_reports where id = v_target_id::uuid and owner_id = v_user_id); exception when invalid_text_representation then return false; end;
end;
$$;
revoke all on function public.can_write_my_record_photo_object(text) from public;
grant execute on function public.can_write_my_record_photo_object(text) to authenticated;

create policy private_record_photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'private-record-photos' and owner_id = auth.uid()::text and public.can_write_my_record_photo_object(name));
create policy private_record_photos_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'private-record-photos' and owner_id = auth.uid()::text and (storage.foldername(name))[1] = auth.uid()::text);
create policy private_record_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'private-record-photos' and owner_id = auth.uid()::text and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.add_my_record_photo(
  p_photo_id uuid, p_target_type text, p_target_id text, p_storage_path text,
  p_sort_order smallint, p_mime_type text, p_byte_size integer, p_width integer, p_height integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_expected_path text; v_object_size bigint;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_target_type not in ('catch_memo', 'field_report') then raise exception 'invalid target type'; end if;
  if p_photo_id is null or p_target_id is null or p_target_id = '' then raise exception 'invalid identifier'; end if;
  v_expected_path := v_user_id::text || '/' || p_target_type || '/' || p_target_id || '/' || p_photo_id::text || '.webp';
  if p_storage_path <> v_expected_path then raise exception 'invalid storage path'; end if;
  if p_sort_order not between 0 and 2 then raise exception 'photo limit exceeded'; end if;
  if p_mime_type <> 'image/webp' or p_byte_size not between 1 and 460800 or
     p_width not between 1 and 1280 or p_height not between 1 and 1280 then raise exception 'invalid photo metadata'; end if;
  if p_target_type = 'catch_memo' and not exists (
    select 1 from public.external_catch_memos where id = p_target_id and owner_id = v_user_id and not is_deleted
  ) then raise exception 'catch owner mismatch'; end if;
  if p_target_type = 'field_report' and not exists (
    select 1 from public.spot_field_reports where id = p_target_id::uuid and owner_id = v_user_id
  ) then raise exception 'report owner mismatch'; end if;
  select (metadata->>'size')::bigint into v_object_size from storage.objects where bucket_id = 'private-record-photos' and name = p_storage_path and owner_id = v_user_id::text and metadata->>'mimetype' = 'image/webp';
  if v_object_size is null then
    raise exception 'storage object not found';
  end if;
  if v_object_size <> p_byte_size or v_object_size not between 1 and 460800 then raise exception 'storage object size mismatch'; end if;
  insert into public.record_photos (id, owner_id, target_type, catch_memo_id, field_report_id, storage_path, sort_order, mime_type, byte_size, width, height)
  values (p_photo_id, v_user_id, p_target_type, case when p_target_type = 'catch_memo' then p_target_id end,
    case when p_target_type = 'field_report' then p_target_id::uuid end, p_storage_path, p_sort_order, p_mime_type, p_byte_size, p_width, p_height);
  return p_photo_id;
exception when invalid_text_representation then raise exception 'invalid target identifier';
end;
$$;
revoke all on function public.add_my_record_photo(uuid, text, text, text, smallint, text, integer, integer, integer) from public;
grant execute on function public.add_my_record_photo(uuid, text, text, text, smallint, text, integer, integer, integer) to authenticated;

create or replace function public.remove_my_record_photo(p_photo_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_path text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  select storage_path into v_path from public.record_photos where id = p_photo_id and owner_id = v_user_id;
  if v_path is null then return false; end if;
  if exists (select 1 from storage.objects where bucket_id = 'private-record-photos' and name = v_path) then
    raise exception 'delete storage object first';
  end if;
  delete from public.record_photos where id = p_photo_id and owner_id = v_user_id;
  return true;
end;
$$;
revoke all on function public.remove_my_record_photo(uuid) from public;
grant execute on function public.remove_my_record_photo(uuid) to authenticated;

create or replace function public.soft_delete_external_catch_memo(p_memo_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if exists (
    select 1 from public.record_photos photo join storage.objects object
      on object.bucket_id = 'private-record-photos' and object.name = photo.storage_path
    where photo.catch_memo_id = p_memo_id and photo.owner_id = v_user_id
  ) then raise exception 'delete linked storage objects first'; end if;
  delete from public.record_photos where catch_memo_id = p_memo_id and owner_id = v_user_id;
  update public.external_catch_memos set is_deleted = true, updated_at = now()
    where id = p_memo_id and owner_id = v_user_id and created_by = 'authenticated_user' and not is_deleted;
  return found;
end;
$$;
revoke all on function public.soft_delete_external_catch_memo(text) from public;
grant execute on function public.soft_delete_external_catch_memo(text) to authenticated;

-- Recovery: remove the policies, RPCs, bucket configuration and record_photos table;
-- restore the prior soft-delete RPC before dropping its metadata integration.
