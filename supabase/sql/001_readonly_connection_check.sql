-- Read-only Supabase connection smoke test for Post-MVP-017.
-- Run manually in the Supabase SQL Editor. Do not paste project secrets here.

create table if not exists public.app_connection_checks (
  id text primary key,
  message text not null,
  created_at timestamptz not null default now()
);

insert into public.app_connection_checks (id, message)
values ('readonly-smoke-test', 'Supabase readonly connection is available')
on conflict (id) do update
set message = excluded.message;

alter table public.app_connection_checks enable row level security;

revoke all on table public.app_connection_checks from anon;
grant select on table public.app_connection_checks to anon;

drop policy if exists "Allow anon read for connection check" on public.app_connection_checks;

create policy "Allow anon read for connection check"
on public.app_connection_checks
for select
to anon
using (id = 'readonly-smoke-test');
