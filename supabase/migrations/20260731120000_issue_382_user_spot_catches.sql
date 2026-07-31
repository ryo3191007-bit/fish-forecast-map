-- Issue #382: link owner-scoped catch records to owner-scoped user spots.
alter table public.external_catch_memos add column user_spot_id uuid null;
alter table public.external_catch_memos
  add constraint external_catch_memos_one_spot_check check (not (spot_id is not null and user_spot_id is not null)),
  add constraint external_catch_memos_user_spot_owner_fk foreign key (user_spot_id, owner_id)
    references public.user_fishing_spots (id, owner_id) on update cascade on delete restrict;
create index external_catch_memos_user_spot_id_idx on public.external_catch_memos (user_spot_id);
create or replace function public.validate_external_catch_user_spot() returns trigger language plpgsql set search_path = '' as $$
begin
  -- Body edits remain possible after soft deletion; only a new or changed link requires an active owner spot.
  if new.user_spot_id is not null and (tg_op = 'INSERT' or old.user_spot_id is distinct from new.user_spot_id) then
    if new.owner_id is distinct from auth.uid() or not exists (
      select 1 from public.user_fishing_spots value where value.id = new.user_spot_id
        and value.owner_id = auth.uid() and value.is_deleted = false
    ) then raise exception 'active owner user fishing spot required' using errcode = '42501'; end if;
  end if;
  return new;
end; $$;
create trigger validate_external_catch_user_spot_before_write before insert or update on public.external_catch_memos
for each row execute function public.validate_external_catch_user_spot();
revoke all on function public.validate_external_catch_user_spot() from public;
-- Recovery: stop writes, drop this trigger/function, constraints/index, then the nullable column. No rows are rewritten.
