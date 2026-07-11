import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findMigrationSafetyIssues } from './check-migration-safety.mjs';

const cases = [
  {
    name: 'rejects ALTER COLUMN TYPE migrations',
    sql: 'alter table catches alter column score type integer;',
    expected: 'type-changing ALTER COLUMN',
  },
  {
    name: 'rejects ALTER COLUMN SET DATA TYPE migrations',
    sql: 'alter table catches alter column score set data type integer;',
    expected: 'type-changing ALTER COLUMN',
  },
  {
    name: 'rejects WHERE-less DELETE with RETURNING',
    sql: 'delete from public.catches returning *;',
    expected: 'unconditional DELETE',
  },
  {
    name: 'rejects WHERE-less DELETE with USING',
    sql: 'delete from public.catches using public.old_catches;',
    expected: 'unconditional DELETE',
  },
  {
    name: 'rejects anon writes inside mixed privilege lists',
    sql: 'grant select, insert on table public.catches to anon;',
    expected: 'anon write grant',
  },
  {
    name: 'rejects unsafe SECURITY DEFINER even when a later function is safe',
    sql: `
create function public.unsafe_fn()
returns void
language sql
security definer
as $$ select 1; $$;

create function public.safe_fn()
returns void
language sql
security definer
set search_path = public
as $$ select 1; $$;
`,
    expected: 'SECURITY DEFINER without SET search_path',
  },
];

for (const testCase of cases) {
  const dir = mkdtempSync(join(tmpdir(), 'migration-safety-'));
  try {
    mkdirSync(join(dir, 'nested'), { recursive: true });
    writeFileSync(join(dir, 'nested', '001_case.sql'), testCase.sql);
    const issues = findMigrationSafetyIssues(dir);
    if (!issues.some((issue) => issue.includes(testCase.expected))) {
      console.error(`${testCase.name}: expected ${testCase.expected}`);
      console.error(issues);
      process.exit(1);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`Migration safety fixture tests passed (${cases.length} cases).`);
