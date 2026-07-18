import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const data = JSON.parse(readFileSync('data/curation/fishing-spots/issue-181-detail-initial-data.json', 'utf8'));
const migration = readFileSync('supabase/migrations/20260718170000_seed_issue_181_fishing_spot_details.sql', 'utf8');
const foundation = readFileSync('supabase/migrations/20260718153000_add_fishing_spot_detail_evidence.sql', 'utf8');
const validSpots = ['nokita-port','nokita-beach','keya-port','keya-gate','funakoshi-port','kishi-port','fukuyoshi-port','hamasaki-beach','niji-matsubara','karatsu-east-port','karatsu-west-port','yobuko-area','imari-inner-bay','fukushima-area','takashima-area','tabira-port','hirado-seto','ikitsuki-area'];
const requiredItemKinds = new Map([
  ['target_species','text_list'],['recommended_methods','text_list'],['shore_access','status'],['toilet','status'],['lighting','status'],['parking','status'],['access','text'],['restriction_status','status'],['depth','number'],['bottom_material','text_list'],['coastal_topography','text_list'],['obstacles','text_list'],['spot_features','text_list'],['water_flow_influences','text_list'],
]);
const validStates = new Set(['has_evidence', 'weak_evidence', 'researched_unknown', 'unresearched', 'rejected']);
const validConfidence = new Set(['high', 'medium', 'low']);
const requiredRelations = ['supporting', 'checked', 'contradicting'];

assert.deepEqual(data.spots.map((spot) => spot.spotId), validSpots, 'Issue #181 must cover the exact 18 target spots in order');
assert.ok(foundation.includes("('water_flow_influences', 'hydrology', 'text_list'"), '14 item keys must match Issue #180 definitions');

const sourceMetadataById = new Map();
let concreteEvidenceRows = 0;
let mappedEvidenceRows = 0;

const mapperSource = readFileSync('src/lib/fishingSpotDetailMapper.ts', 'utf8');
const mapperJs = ts.transpileModule(mapperSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const mapperModulePath = join(mkdtempSync(join(tmpdir(), 'issue-181-mapper-')), 'fishingSpotDetailMapper.mjs');
writeFileSync(mapperModulePath, mapperJs);
const { mapSpotDetailValueRow } = await import(`file://${mapperModulePath}`);

function relationRows(value, spot) {
  return requiredRelations.flatMap((relation) => value.sources[relation].map((sourceId) => {
    const source = spot.sources.find((entry) => entry.id === sourceId);
    return {
      relation,
      note: null,
      fishing_spot_detail_sources: {
        id: source.id,
        source_type: source.sourceType,
        source_name: source.sourceName,
        source_url: source.sourceUrl,
        checked_on: source.checkedOn,
        note: source.note,
      },
    };
  }));
}

function valueRow(value, spot) {
  return {
    id: value.id,
    spot_id: spot.spotId,
    item_key: value.itemKey,
    information_state: value.informationState,
    value_text: value.valueText,
    value_text_list: value.valueTextList,
    value_number: value.valueNumber,
    value_boolean: value.valueBoolean,
    value_json: value.valueJson,
    unit: value.unit,
    confidence: value.confidence,
    contribution_origin: 'curated_research',
    contributor_id: null,
    submitted_at: null,
    moderation_status: 'not_required',
    review_status: 'reviewed',
    adoption_status: 'adopted',
    note: value.note,
    checked_at: value.checkedAt,
    fishing_spot_detail_value_sources: relationRows(value, spot),
  };
}


for (const spot of data.spots) {
  const sources = new Set(spot.sources.map((source) => source.id));
  assert.equal(spot.values.length, requiredItemKinds.size, `${spot.spotId} should have all 14 detail item results`);
  assert.deepEqual(spot.values.map((value) => value.itemKey), [...requiredItemKinds.keys()], `${spot.spotId} item keys must match Issue #180 order`);
  assert.ok(spot.researchSource.endsWith(`${spot.spotId}.json`), `${spot.spotId} should cite matching research JSON`);

  for (const source of spot.sources) {
    const metadata = JSON.stringify({ sourceType: source.sourceType, sourceName: source.sourceName, sourceUrl: source.sourceUrl, checkedOn: source.checkedOn, note: source.note });
    if (sourceMetadataById.has(source.id)) assert.equal(sourceMetadataById.get(source.id), metadata, `${source.id} reused with conflicting metadata`);
    sourceMetadataById.set(source.id, metadata);
  }

  for (const value of spot.values) {
    assert.ok(validStates.has(value.informationState), `${value.id} has invalid information state`);
    const concreteColumns = ['valueText','valueTextList','valueNumber','valueBoolean','valueJson'].filter((key) => key === 'valueTextList' ? value[key].length > 0 : value[key] !== null);
    const hasConcreteInformation = value.informationState === 'has_evidence' || value.informationState === 'weak_evidence';
    if (hasConcreteInformation) {
      assert.equal(concreteColumns.length, 1, `${value.id} must use exactly one concrete value column`);
      assert.ok(validConfidence.has(value.confidence), `${value.id} concrete values need allowed confidence`);
      concreteEvidenceRows += 1;
    } else {
      assert.equal(value.confidence, null, `${value.id} unknown/rejected values must not use confidence`);
      assert.deepEqual(concreteColumns, [], `${value.id} informationなし must not fabricate values`);
    }

    const kind = requiredItemKinds.get(value.itemKey);
    if (hasConcreteInformation) {
      if (kind === 'text' || kind === 'status' || kind === 'enum') assert.deepEqual(concreteColumns, ['valueText'], `${value.id} must store ${kind} in valueText`);
      if (kind === 'text_list') assert.deepEqual(concreteColumns, ['valueTextList'], `${value.id} must store text_list in valueTextList`);
      if (kind === 'number') assert.deepEqual(concreteColumns, ['valueNumber'], `${value.id} must store number in valueNumber`);
      if (kind === 'boolean') assert.deepEqual(concreteColumns, ['valueBoolean'], `${value.id} must store boolean in valueBoolean`);
      if (kind === 'json') assert.deepEqual(concreteColumns, ['valueJson'], `${value.id} must store json in valueJson`);
    }


    if (!hasConcreteInformation) {
      assert.deepEqual(value.sources.supporting, [], `${value.id} non-concrete values must not have supporting sources`);
    } else {
      assert.ok(value.sources.supporting.length > 0, `${value.id} concrete values must have supporting sources`);
      const mapped = mapSpotDetailValueRow(valueRow(value, spot), { itemKey: value.itemKey, category: 'basic', valueKind: kind, labelJa: value.itemKey, displayOrder: 0 });
      assert.notEqual(mapped, null, `${value.id} mapper result must not be null`);
      assert.equal(mapped.itemKey, value.itemKey, `${value.id} mapper itemKey must match input`);
      assert.equal(mapped.informationState, value.informationState, `${value.id} mapper informationState must match input`);
      assert.equal(mapped.confidence, value.confidence, `${value.id} mapper confidence must match input`);
      assert.equal(mapped.valueText, value.valueText, `${value.id} mapper valueText must match input`);
      assert.deepEqual(mapped.valueTextList, value.valueTextList, `${value.id} mapper valueTextList must match input`);
      assert.equal(mapped.valueNumber, value.valueNumber, `${value.id} mapper valueNumber must match input`);
      assert.equal(mapped.valueBoolean, value.valueBoolean, `${value.id} mapper valueBoolean must match input`);
      assert.deepEqual(mapped.valueJson, value.valueJson, `${value.id} mapper valueJson must match input`);
      mappedEvidenceRows += 1;
    }

    const sourceUsage = new Set();
    for (const relation of requiredRelations) {
      for (const sourceId of value.sources[relation]) {
        assert.equal(sourceUsage.has(sourceId), false, `${value.id} duplicates source ${sourceId} across relation buckets`);
        sourceUsage.add(sourceId);
      }
    }

    for (const relation of requiredRelations) {
      assert.ok(Array.isArray(value.sources[relation]), `${value.id} missing ${relation} source bucket`);
      for (const sourceId of value.sources[relation]) assert.ok(sources.has(sourceId), `${value.id} references missing source ${sourceId}`);
    }
    assert.equal(value.note?.startsWith('警告') ?? false, false, `${value.id} must not auto-use notes as UI warnings`);
  }
}

assert.ok(concreteEvidenceRows > 0, 'has_evidence / weak_evidence rows must exist');
assert.equal(mappedEvidenceRows, concreteEvidenceRows, 'concrete value row count must equal mapper success count');
assert.equal(sourceMetadataById.size, [...sourceMetadataById.keys()].length, 'source IDs must be unique or metadata-identical across all spots');

const nokitaWaterFlow = data.spots.find((spot) => spot.spotId === 'nokita-port').values.find((value) => value.itemKey === 'water_flow_influences');
assert.equal(nokitaWaterFlow.informationState, 'has_evidence', 'combined water-flow values must not become unknown when some attributes are confirmed');
assert.ok(nokitaWaterFlow.valueTextList.includes('river_influence:none'), 'combined water-flow value must retain confirmed river influence');
assert.ok(nokitaWaterFlow.valueTextList.includes('open_sea_exposure:open_sea'), 'combined water-flow value must retain confirmed open-sea influence');

assert.ok(migration.includes('on conflict (id) do update'), 'migration must use deterministic upserts');
assert.ok(migration.includes('value_number=excluded.value_number'), 'migration must upsert valueNumber');
assert.ok(migration.includes('value_boolean=excluded.value_boolean'), 'migration must upsert valueBoolean');
assert.ok(migration.includes('value_json=excluded.value_json'), 'migration must upsert valueJson');
assert.ok(migration.includes('unit=excluded.unit'), 'migration must upsert unit');
assert.ok(migration.includes("nullif(value->>'valueNumber','')::numeric"), 'migration must insert valueNumber');
assert.ok(migration.includes("nullif(value->>'valueBoolean','')::boolean"), 'migration must insert valueBoolean');
assert.ok(migration.includes("nullif(value->'valueJson', 'null'::jsonb)"), 'migration must insert valueJson');
assert.ok(migration.includes("nullif(value->>'unit','')"), 'migration must insert unit');
assert.ok(migration.includes('Issue #181 curated seed'), 'migration must tag seeded rows for recovery');
assert.ok(!migration.toLowerCase().includes('drop table'), 'migration must not be destructive');
