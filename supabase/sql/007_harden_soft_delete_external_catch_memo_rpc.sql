-- Manual SQL for Post-MVP-030 / Issue #85 follow-up.
-- Run in the Supabase SQL Editor after 006 has been applied and reviewed.
-- Hardens logical delete RPC so it can update owner-scoped active rows without
-- weakening RLS policies or making deleted rows selectable.

create or replace function public.soft_delete_external_catch_memo(p_memo_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  updated_count integer := 0;
begin
  if caller_id is null then
    return false;
  end if;

  update public.external_catch_memos
  set
    is_deleted = true,
    updated_at = pg_catalog.now()
  where
    id = p_memo_id
    and owner_id = caller_id
    and created_by = 'authenticated_user'
    and is_deleted = false;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.soft_delete_external_catch_memo(text) from public;
revoke all on function public.soft_delete_external_catch_memo(text) from anon;
grant execute on function public.soft_delete_external_catch_memo(text) to authenticated;
