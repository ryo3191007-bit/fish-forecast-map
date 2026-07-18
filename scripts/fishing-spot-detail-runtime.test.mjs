import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);
const moduleCache = new Map();

function loadTsModule(relativePath) {
  if (moduleCache.has(relativePath)) return moduleCache.get(relativePath).exports;
  const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const compiledModule = { exports: {} };
  moduleCache.set(relativePath, compiledModule);
  const localRequire = (specifier) => {
    if (specifier.startsWith('@/')) return loadTsModule(`src/${specifier.slice(2)}.ts`);
    return nodeRequire(specifier);
  };
  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', outputText);
  fn(compiledModule.exports, localRequire, compiledModule, join(process.cwd(), relativePath), join(process.cwd(), relativePath, '..'));
  return compiledModule.exports;
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

const mapper = loadTsModule('src/lib/fishingSpotDetailMapper.ts');
const fallback = loadTsModule('src/lib/fishingSpotDetailFallback.ts');
const repository = loadTsModule('src/lib/fishingSpotDetailRepository.ts');

const definitions = [{ item_key: 'shore_access', category: 'access', value_kind: 'status', label_ja: '足場', display_order: 1 }];
const validSource = { relation: 'supporting', fishing_spot_detail_sources: { id: 'src-1', source_type: 'field_research', source_name: 'manual', source_url: null } };
const baseValue = {
  id: 'value-1',
  spot_id: 'spot-1',
  item_key: 'shore_access',
  information_state: 'weak_evidence',
  value_text: '足場良い',
  value_text_list: [],
  value_number: null,
  value_boolean: null,
  value_json: null,
  confidence: 'low',
  moderation_status: 'not_required',
  review_status: 'reviewed',
  adoption_status: 'adopted',
  fishing_spot_detail_value_sources: [validSource],
};

assert(mapper.mapFishingSpotDetailRows(definitions, [baseValue]).values.length === 1, 'mapper should accept valid rows with a matching item definition');
assert(mapper.mapFishingSpotDetailRows([], [baseValue]).values.length === 0, 'mapper should exclude values without an item definition');
assert(mapper.mapFishingSpotDetailRows(definitions, [{ ...baseValue, item_key: 'undefined_item' }]).values.length === 0, 'mapper should exclude values whose item key has no definition');
assert(mapper.mapFishingSpotDetailRows(definitions, [{ ...baseValue, information_state: 'researched_unknown', value_text: '不明', confidence: null }]).values.length === 0, 'mapper should reject unknown rows carrying concrete values');
assert(mapper.mapFishingSpotDetailRows(definitions, [{ ...baseValue, fishing_spot_detail_value_sources: [] }]).values.length === 0, 'mapper should reject concrete evidence rows without a supporting source');

assert(mapper.mapFishingSpotDetailRows(definitions, [{ ...baseValue, value_text: null, value_number: 1 }]).values.length === 0, 'mapper should reject rows whose populated value column does not match value_kind');
assert(mapper.mapFishingSpotDetailRows(definitions, [{ ...baseValue, value_number: Number.NaN }]).values.length === 0, 'mapper should reject NaN numeric values');
assert(mapper.mapFishingSpotDetailRows(definitions, [{ ...baseValue, value_text_list: ['足場良い'] }]).values.length === 0, 'mapper should reject rows with multiple populated value columns');

const fallbackDetails = fallback.buildStaticFishingSpotDetailsFromSpots([
  { id: 'known', targetSpecies: ['アジ'], recommendedMethods: ['サビキ'], shoreAccess: '足場良い' },
  { id: 'unknown', targetSpecies: [], recommendedMethods: [], shoreAccess: '不明' },
]);
const unknownShoreAccess = fallbackDetails.values.find((value) => value.spotId === 'unknown' && value.itemKey === 'shore_access');
const knownShoreAccess = fallbackDetails.values.find((value) => value.spotId === 'known' && value.itemKey === 'shore_access');
assert(unknownShoreAccess?.informationState === 'unresearched', 'fallback should treat shore access 不明 as no information');
assert(unknownShoreAccess?.valueText === null, 'fallback should not expose 不明 as a concrete value');
assert(unknownShoreAccess?.confidence === null, 'fallback no-information rows should not carry confidence');
assert(knownShoreAccess?.adoptionStatus === 'candidate', 'fallback initial adoption status should be candidate');

const supabaseFallback = await repository.fetchFishingSpotDetails('known');
assert(supabaseFallback.meta.source === 'static-fallback', 'repository should fallback to static data when Supabase fetch is unavailable');
assert(supabaseFallback.meta.fallbackReason === 'supabase-not-configured', 'repository should report Supabase fallback reason when public env is missing');
assert(supabaseFallback.data.values.every((value) => value.spotId !== 'known') || supabaseFallback.data.values.length === 0, 'repository fallback should safely handle unknown spot ids');

console.log('Fishing spot detail runtime checks passed.');
