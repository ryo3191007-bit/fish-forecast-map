import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/curation/fishing-spots/issue-181-detail-initial-data.json', 'utf8'));
const validSpots = [
  'nokita-port','nokita-beach','keya-port','keya-gate','funakoshi-port','kishi-port','fukuyoshi-port','hamasaki-beach','niji-matsubara','karatsu-east-port','karatsu-west-port','yobuko-area','imari-inner-bay','fukushima-area','takashima-area','tabira-port','hirado-seto','ikitsuki-area',
];
const validStates = new Set(['has_evidence', 'weak_evidence', 'researched_unknown', 'unresearched', 'rejected']);
const validConfidence = new Set(['high', 'medium', 'low']);
const requiredRelations = ['supporting', 'checked', 'contradicting'];

assert.deepEqual(data.spots.map((spot) => spot.spotId), validSpots, 'Issue #181 must cover the exact 18 target spots in order');

for (const spot of data.spots) {
  const sources = new Set(spot.sources.map((source) => source.id));
  assert.equal(spot.values.length, 12, `${spot.spotId} should have all fallback/detail item results`);
  assert.ok(spot.researchSource.endsWith(`${spot.spotId}.json`), `${spot.spotId} should cite matching research JSON`);
  for (const value of spot.values) {
    assert.ok(validStates.has(value.informationState), `${value.id} has invalid information state`);
    if (value.informationState === 'researched_unknown' || value.informationState === 'unresearched' || value.informationState === 'rejected') {
      assert.equal(value.confidence, null, `${value.id} unknown/rejected values must not use confidence`);
      assert.equal(value.valueText, null, `${value.id} informationなし must not fabricate text`);
      assert.deepEqual(value.valueTextList, [], `${value.id} informationなし must not fabricate list values`);
    } else {
      assert.ok(validConfidence.has(value.confidence), `${value.id} concrete values need allowed confidence`);
    }
    for (const relation of requiredRelations) {
      assert.ok(Array.isArray(value.sources[relation]), `${value.id} missing ${relation} source bucket`);
      for (const sourceId of value.sources[relation]) assert.ok(sources.has(sourceId), `${value.id} references missing source ${sourceId}`);
    }
    assert.equal(value.note?.startsWith('警告') ?? false, false, `${value.id} must not auto-use notes as UI warnings`);
  }
}

const migration = readFileSync('supabase/migrations/20260718170000_seed_issue_181_fishing_spot_details.sql', 'utf8');
assert.ok(migration.includes('on conflict (id) do update'), 'migration must use deterministic upserts');
assert.ok(migration.includes('Issue #181 curated seed'), 'migration must tag seeded rows for recovery');
assert.ok(!migration.toLowerCase().includes('drop table'), 'migration must not be destructive');
