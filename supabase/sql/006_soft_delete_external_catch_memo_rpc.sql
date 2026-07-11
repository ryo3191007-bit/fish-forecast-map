-- RLS-compatible soft delete RPC for external_catch_memos.
-- Run manually in the Supabase SQL Editor after reviewing the statements below.
-- Do not paste project secrets, privileged server keys, database URLs, JWTs, or passwords here.

create or replace function public.soft_delete_external_catch_memo(p_memo_id text)
returns boolean
language plpgsql
set search_path = public, auth
as $$
declare
  updated_count integer := 0;
begin
  update public.external_catch_memos
  set
    is_deleted = true,
    updated_at = now()
  where id = p_memo_id
    and owner_id = auth.uid()
    and is_deleted = false;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.soft_delete_external_catch_memo(text) from public;
revoke all on function public.soft_delete_external_catch_memo(text) from anon;
grant execute on function public.soft_delete_external_catch_memo(text) to authenticated;
