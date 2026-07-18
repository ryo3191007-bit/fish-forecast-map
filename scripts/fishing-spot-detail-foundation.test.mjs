import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260718153000_add_fishing_spot_detail_evidence.sql'), 'utf8').toLowerCase();
const mapper = readFileSync(join(process.cwd(), 'src/lib/fishingSpotDetailMapper.ts'), 'utf8');
const repository = readFileSync(join(process.cwd(), 'src/lib/fishingSpotDetailRepository.ts'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

for (const table of ['fishing_spot_detail_item_definitions', 'fishing_spot_detail_values', 'fishing_spot_detail_sources', 'fishing_spot_detail_value_sources']) {
  assert(migration.includes(`create table if not exists public.${table}`), `${table} must be created with IF NOT EXISTS`);
  assert(migration.includes(`alter table public.${table} enable row level security`), `${table} must enable RLS`);
  assert(migration.includes(`grant select on table public.${table} to anon, authenticated`), `${table} must grant select only to anon/authenticated`);
}

assert(!/grant\s+(insert|update|delete|all privileges)[\s\S]*\bto\s+anon\b/.test(migration), 'migration must not grant anon write privileges');
assert(!migration.includes('disable row level security'), 'migration must not disable RLS');
assert(!migration.includes('drop table'), 'migration must not drop tables');
assert(!migration.includes('drop column'), 'migration must not drop columns');
assert(migration.includes("information_state = any (array['has_evidence', 'weak_evidence', 'researched_unknown', 'unresearched', 'rejected']"), 'information_state states must distinguish unavailable information from weak evidence');
assert(migration.includes("confidence is null") && migration.includes("information_state in ('researched_unknown', 'unresearched')"), 'unknown/no information states must not carry confidence');
assert(migration.includes("relation = any (array['supporting', 'checked', 'contradicting']"), 'source relation must support supporting/checked/contradicting');
assert(migration.includes("contribution_origin = any (array['curated_research', 'user_contribution']"), 'origin must distinguish curated research and future user contributions');
assert(repository.includes('supabase-not-configured') && repository.includes('static-fallback'), 'repository must fallback when Supabase is not configured');
assert(repository.includes('supabase-error'), 'repository must fallback on Supabase errors');
assert(!mapper.includes('信憑性') && !mapper.includes('情報なし'), 'mapper must not convert unknown/null states into UI labels');
assert(mapper.includes('note: row.note ?? null'), 'mapper must preserve notes without UI display side effects');

console.log('Fishing spot detail foundation checks passed.');
