-- Owner scoped RLS policy proposal for external_catch_memos.
-- Design only: do not run this in a production Supabase project until the manual SQL checkpoint is approved.
-- This file intentionally targets authenticated users only, does not grant anon writes, and avoids physical delete policies.
-- Do not paste project secrets, privileged server keys, database URLs, or passwords here.

alter table public.external_catch_memos enable row level security;

revoke all on table public.external_catch_memos from anon, authenticated;

grant select, insert, update on table public.external_catch_memos to authenticated;

-- Recreate policies so this proposal is easy to re-run during manual SQL review.
drop policy if exists external_catch_memos_owner_select on public.external_catch_memos;
drop policy if exists external_catch_memos_owner_insert on public.external_catch_memos;
drop policy if exists external_catch_memos_owner_update on public.external_catch_memos;

create policy external_catch_memos_owner_select
on public.external_catch_memos
for select
to authenticated
using (
  owner_id = auth.uid()
  and is_deleted = false
);

create policy external_catch_memos_owner_insert
on public.external_catch_memos
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and is_deleted = false
  and created_by = 'authenticated_user'
);

create policy external_catch_memos_owner_update
on public.external_catch_memos
for update
to authenticated
using (
  owner_id = auth.uid()
)
with check (
  owner_id = auth.uid()
  and created_by = 'authenticated_user'
);

-- No delete policy is defined. Deletion should be implemented as a soft delete by updating is_deleted = true.
-- No anon policies are defined in this proposal.
