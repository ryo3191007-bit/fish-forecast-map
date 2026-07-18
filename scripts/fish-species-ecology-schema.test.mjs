import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = process.cwd();
const schema = JSON.parse(fs.readFileSync(path.join(root, 'docs/schemas/fish-species-ecology.schema.json'), 'utf8'));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
assert.doesNotThrow(() => ajv.compile(schema), 'schema must be valid JSON Schema');
const validate = ajv.compile(schema);
const targets = { aji: 'アジ', seabass: 'シーバス', chinu: 'チヌ' };
const docs = Object.fromEntries(Object.keys(targets).map((id) => [id, JSON.parse(fs.readFileSync(path.join(root, `data/research/fish-species/${id}.json`), 'utf8'))]));

function collectClaims(value, pointer = '', claims = []) {
  if (value && typeof value === 'object') {
    if ('status' in value && 'evidenceSources' in value) claims.push([pointer, value]);
    for (const [key, child] of Object.entries(value)) collectClaims(child, `${pointer}/${key}`, claims);
  }
  return claims;
}

function collectTextFragments(value, pointer = '', fragments = []) {
  if (typeof value === 'string') {
    if (pointer.includes('/supports/')) return fragments;
    const normalized = value.replace(/https?:\/\/\S+/g, '').replace(/[\s、。，．・/／()（）「」『』:：;；,.-]+/g, '').toLowerCase();
    if (normalized.length >= 24) fragments.push([pointer, normalized]);
  } else if (Array.isArray(value)) {
    value.forEach((child, index) => collectTextFragments(child, `${pointer}/${index}`, fragments));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) collectTextFragments(child, `${pointer}/${key}`, fragments);
  }
  return fragments;
}

function similarity(a, b) {
  const grams = (text) => new Set(Array.from({ length: Math.max(0, text.length - 2) }, (_, i) => text.slice(i, i + 3)));
  const ga = grams(a);
  const gb = grams(b);
  if (!ga.size || !gb.size) return 0;
  let intersection = 0;
  for (const g of ga) if (gb.has(g)) intersection += 1;
  return intersection / Math.min(ga.size, gb.size);
}

function validateResearchDoc(id, doc) {
  assert.equal(validate(doc), true, `${id}: ${ajv.errorsText(validate.errors)}`);
  assert.equal(doc.speciesId, id);
  assert.equal(doc.identity.displayNameJa, targets[id]);
  const sourceIds = new Set(doc.sources.map((source) => source.id));
  assert.equal(sourceIds.size, doc.sources.length, `${id}: source ids must be unique`);
  const sourceById = new Map(doc.sources.map((source) => [source.id, source]));
  const derivations = new Set();
  for (const source of doc.sources) {
    const duplicateKey = source.derivationGroup;
    assert(!derivations.has(duplicateKey), `${id}: duplicated derivation group counted as independent evidence`);
    derivations.add(duplicateKey);
    for (const supportedPath of source.supports) assert(supportedPath.startsWith('/'), `${id}: support path must be JSON pointer`);
    assert(source.checkedAt, `${id}: source checkedAt required`);
    assert(source.regionScope, `${id}: source regionScope required`);
  }

  const claims = collectClaims(doc);
  const allClaimPaths = new Set(claims.map(([pointer]) => pointer));
  for (const source of doc.sources) for (const supportedPath of source.supports) assert(allClaimPaths.has(supportedPath), `${id}: source.supports points to missing claim ${supportedPath}`);

  for (const [pointer, claim] of claims) {
    const lists = ['supportingSourceIds', 'checkedSourceIds', 'contradictingSourceIds'].map((key) => claim.evidenceSources[key]);
    const flat = lists.flat();
    assert.equal(new Set(flat).size, flat.length, `${id}:${pointer}: evidence lists overlap or duplicate`);
    for (const sourceId of flat) assert(sourceIds.has(sourceId), `${id}:${pointer}: missing source ${sourceId}`);
    for (const listKey of ['supportingSourceIds', 'checkedSourceIds', 'contradictingSourceIds']) {
      for (const sourceId of claim.evidenceSources[listKey]) {
        assert(sourceById.get(sourceId).supports.includes(pointer), `${id}:${pointer}: ${listKey} source ${sourceId} does not reference claim path`);
      }
    }
    if (['confirmed', 'inferred'].includes(claim.status)) assert(claim.evidenceSources.supportingSourceIds.length > 0, `${id}:${pointer}: confirmed/inferred requires support`);
    if (claim.status === 'unknown') assert.equal(claim.value, null, `${id}:${pointer}: unknown must not contain concrete value`);
    if (pointer.includes('regionalCatchability') && claim.status !== 'unknown') assert(claim.regionScope, `${id}:${pointer}: regional value requires regionScope`);
    if (claim.unit === 'celsius' && claim.value) {
      for (const key of ['min', 'max', 'point']) {
        if (claim.value[key] !== undefined) assert(claim.value[key] >= -2 && claim.value[key] <= 35, `${id}:${pointer}: invalid celsius ${key}`);
      }
    }
    if (claim.unit === 'm' && claim.value) {
      if (claim.rangeType === 'maximum_only') assert(claim.value.min === undefined && claim.value.max >= 0 && claim.value.max <= 1000, `${id}:${pointer}: maximum_only depth must not invent min`);
      if (claim.rangeType === 'bounded_range') assert(claim.value.min >= 0 && claim.value.max <= 1000, `${id}:${pointer}: invalid depth range`);
    }
    if (claim.value?.months) for (const month of claim.value.months) assert(month >= 1 && month <= 12, `${id}:${pointer}: invalid month`);
    if (pointer.endsWith('/waterTemperature') && claim.temperatureContext === 'spawning') assert(!pointer.includes('regionalCatchability'), `${id}:${pointer}: spawning temperature cannot be catchability input`);
  }
  assert.notEqual(doc.identity.displayNameJa, doc.identity.scientificName.value, `${id}: display/scientific over-merged`);
  assert(doc.identity.entityType !== 'unknown' || doc.identity.canonicalNameJa.status === 'unknown');
}

function assertNoOverSimilarCopies(allDocs) {
  const fragments = Object.entries(allDocs).flatMap(([id, doc]) => collectTextFragments({ identity: doc.identity, ecology: doc.ecology, sources: doc.sources }).map(([pointer, text]) => ({ id, pointer, text })));
  for (let i = 0; i < fragments.length; i++) {
    for (let j = i + 1; j < fragments.length; j++) {
      const a = fragments[i];
      const b = fragments[j];
      if (a.id === b.id) continue;
      assert(similarity(a.text, b.text) < 0.92, `${a.id}:${a.pointer} and ${b.id}:${b.pointer} are overly similar copied text`);
    }
  }
}

for (const [id, doc] of Object.entries(docs)) validateResearchDoc(id, doc);
assertNoOverSimilarCopies(docs);

const copiedFixture = structuredClone(docs.aji);
copiedFixture.speciesId = 'seabass';
copiedFixture.identity.displayNameJa = 'シーバス';
assert.throws(() => assertNoOverSimilarCopies({ aji: docs.aji, copiedFixture }), /overly similar copied text/);

const oneWayFixture = structuredClone(docs.chinu);
oneWayFixture.sources.find((source) => source.id === oneWayFixture.identity.scientificName.evidenceSources.supportingSourceIds[0]).supports = [];
assert.throws(() => validateResearchDoc('chinu', oneWayFixture), /supportingSourceIds source .* does not reference claim path/);


const checkedFixture = structuredClone(docs.aji);
const checkedClaim = checkedFixture.ecology.stableGeneral.depthRange;
checkedClaim.evidenceSources.checkedSourceIds = ['tsuriking_fukuoka_aji'];
assert.throws(() => validateResearchDoc('aji', checkedFixture), /checkedSourceIds source .* does not reference claim path/);

const contradictingFixture = structuredClone(docs.chinu);
const contradictingClaim = contradictingFixture.ecology.regionalCatchability.waterTemperature;
contradictingClaim.evidenceSources.contradictingSourceIds = ['bisma_kurodai'];
assert.throws(() => validateResearchDoc('chinu', contradictingFixture), /contradictingSourceIds source .* does not reference claim path/);

const duplicateDerivationFixture = structuredClone(docs.chinu);
duplicateDerivationFixture.sources.push({
  ...structuredClone(duplicateDerivationFixture.sources[0]),
  id: 'duplicate_derivation_checked_source',
  sourceType: 'checked',
});
assert.throws(() => validateResearchDoc('chinu', duplicateDerivationFixture), /duplicated derivation group/);

const invalidPointCelsiusFixture = structuredClone(docs.chinu);
invalidPointCelsiusFixture.ecology.regionalCatchability.waterTemperature.value.point = 60;
assert.throws(() => validateResearchDoc('chinu', invalidPointCelsiusFixture), /invalid celsius point/);

const invalidMinimumOnlyCelsiusFixture = structuredClone(docs.chinu);
invalidMinimumOnlyCelsiusFixture.ecology.regionalCatchability.waterTemperature.rangeType = 'minimum_only';
invalidMinimumOnlyCelsiusFixture.ecology.regionalCatchability.waterTemperature.value = { min: -5 };
assert.throws(() => validateResearchDoc('chinu', invalidMinimumOnlyCelsiusFixture), /invalid celsius min/);

const invalidMaximumOnlyCelsiusFixture = structuredClone(docs.chinu);
invalidMaximumOnlyCelsiusFixture.ecology.regionalCatchability.waterTemperature.rangeType = 'maximum_only';
invalidMaximumOnlyCelsiusFixture.ecology.regionalCatchability.waterTemperature.value = { max: 40 };
assert.throws(() => validateResearchDoc('chinu', invalidMaximumOnlyCelsiusFixture), /invalid celsius max/);

console.log('fish species ecology schema tests passed');
