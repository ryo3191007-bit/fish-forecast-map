import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findMigrationSafetyIssues } from './check-migration-safety.mjs';

function inspectSql(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'migration-safety-'));
  try {
    mkdirSync(join(dir, 'nested'), { recursive: true });
    writeFileSync(join(dir, 'nested', '001_case.sql'), sql);
    return findMigrationSafetyIssues(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const unsafeCases = [
  ['DROP TABLE', 'drop table public.catches;', 'DROP TABLE'],
  ['DROP COLUMN', 'alter table public.catches drop column score;', 'DROP COLUMN'],
  ['TRUNCATE', 'truncate table public.catches;', 'TRUNCATE'],
  ['ALTER COLUMN TYPE', 'alter table public.catches alter column score type integer;', 'type-changing ALTER COLUMN'],
  ['ALTER COLUMN SET DATA TYPE', 'alter table public.catches alter column score set data type integer;', 'type-changing ALTER COLUMN'],
  ['WHERE-less DELETE with RETURNING', 'delete from public.catches returning *;', 'unconditional DELETE'],
  ['WHERE-less DELETE with USING', 'delete from public.catches using public.old_catches;', 'unconditional DELETE'],
  ['WHERE-less UPDATE', 'update public.catches set score = 0;', 'unconditional UPDATE'],
  ['RLS disabled', 'alter table public.catches disable row level security;', 'RLS disabled'],
  ['anon INSERT grant', 'grant select, insert on table public.catches to anon;', 'anon write grant'],
  ['anon UPDATE grant', 'grant update on table public.catches to anon;', 'anon write grant'],
  ['anon DELETE grant', 'grant delete on table public.catches to anon;', 'anon write grant'],
  ['GRANT ALL', 'grant all privileges on table public.catches to authenticated;', 'GRANT ALL'],
  [
    'unsafe SECURITY DEFINER beside a safe function',
    `
create function public.unsafe_fn()
returns void
language sql
security definer
as $$ select 1; $$;

create function public.safe_fn()
returns void
language sql
security definer
set search_path = ''
as $$ select 1; $$;
`,
    'SECURITY DEFINER without safe SET search_path',
  ],
  [
    'unsafe mutation inside a function body',
    `
create function public.unsafe_update()
returns void
language plpgsql
security invoker
as $$
begin
  update public.catches set score = 0;
end;
$$;
`,
    'unconditional UPDATE',
  ],
];

for (const [name, sql, expected] of unsafeCases) {
  const issues = inspectSql(sql);
  if (!issues.some((issue) => issue.includes(expected))) {
    console.error(`${name}: expected ${expected}`);
    console.error(issues);
    process.exit(1);
  }
}

const safeCases = [
  [
    'safe DDL, RLS, grants, and scoped mutations',
    `
-- DROP TABLE in a comment must not trigger the gate.
create table if not exists public.catches (id text primary key, score integer);
alter table public.catches enable row level security;
grant select on table public.catches to anon;
grant insert on table public.catches to authenticated;
grant truncate on table public.catches to service_role;
update public.catches set score = 1 where id = 'sample';
delete from public.catches where id = 'sample';
`,
  ],
  [
    'safe SECURITY DEFINER with an empty search_path',
    `
create or replace function public.safe_fn()
returns void
language sql
security definer
set search_path = ''
as $$ select 1; $$;
`,
  ],
  [
    'safe SECURITY DEFINER with quoted pg_catalog search_path',
    `
create or replace function public.safe_event_fn()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$ begin return; end; $$;
`,
  ],
  [
    'statement boundaries prevent cross-statement grant false positives',
    `
grant select on table public.catches to anon;
grant insert on table public.catches to authenticated;
`,
  ],
];

for (const [name, sql] of safeCases) {
  const issues = inspectSql(sql);
  if (issues.length > 0) {
    console.error(`${name}: expected no issues`);
    console.error(issues);
    process.exit(1);
  }
}

console.log(`Migration safety fixture tests passed (${unsafeCases.length} unsafe, ${safeCases.length} safe).`);
