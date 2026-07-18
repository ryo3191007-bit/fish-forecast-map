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

const claimPaths = [];
function walk(value, pointer = '') {
  if (value && typeof value === 'object') {
    if ('status' in value && 'evidenceSources' in value) claimPaths.push(pointer);
    for (const [key, child] of Object.entries(value)) walk(child, `${pointer}/${key}`);
  }
}

for (const [id, doc] of Object.entries(docs)) {
  assert.equal(validate(doc), true, `${id}: ${ajv.errorsText(validate.errors)}`);
  assert.equal(doc.speciesId, id);
  assert.equal(doc.identity.displayNameJa, targets[id]);
  const sourceIds = new Set(doc.sources.map((source) => source.id));
  assert.equal(sourceIds.size, doc.sources.length, `${id}: source ids must be unique`);
  const derivations = new Set();
  for (const source of doc.sources) {
    const duplicateKey = `${source.derivationGroup}:${source.sourceType}`;
    assert(!derivations.has(duplicateKey), `${id}: duplicated derivation group counted as independent evidence`);
    derivations.add(duplicateKey);
    for (const supportedPath of source.supports) assert(supportedPath.startsWith('/'), `${id}: support path must be JSON pointer`);
    assert(source.checkedAt, `${id}: source checkedAt required`);
    assert(source.regionScope, `${id}: source regionScope required`);
  }
  claimPaths.length = 0;
  walk(doc);
  const allClaimPaths = new Set(claimPaths);
  for (const source of doc.sources) for (const supportedPath of source.supports) assert(allClaimPaths.has(supportedPath), `${id}: source.supports points to missing claim ${supportedPath}`);
  function checkClaim(claim, pointer) {
    if (!claim || typeof claim !== 'object') return;
    if ('status' in claim && 'evidenceSources' in claim) {
      const lists = ['supportingSourceIds', 'checkedSourceIds', 'contradictingSourceIds'].map((key) => claim.evidenceSources[key]);
      const flat = lists.flat();
      assert.equal(new Set(flat).size, flat.length, `${id}:${pointer}: evidence lists overlap or duplicate`);
      for (const sourceId of flat) assert(sourceIds.has(sourceId), `${id}:${pointer}: missing source ${sourceId}`);
      if (['confirmed', 'inferred'].includes(claim.status)) assert(claim.evidenceSources.supportingSourceIds.length > 0, `${id}:${pointer}: confirmed/inferred requires support`);
      if (claim.status === 'unknown') assert.equal(claim.value, null, `${id}:${pointer}: unknown must not contain concrete value`);
      if (pointer.includes('regionalCatchability') && claim.status !== 'unknown') assert(claim.regionScope, `${id}:${pointer}: regional value requires regionScope`);
      if (claim.unit === 'celsius' && claim.value) { assert(claim.value.min >= -2 && claim.value.max <= 35); }
      if (claim.unit === 'm' && claim.value) { assert(claim.value.min >= 0 && claim.value.max <= 1000); }
      if (claim.value?.months) for (const month of claim.value.months) assert(month >= 1 && month <= 12, `${id}:${pointer}: invalid month`);
    }
    for (const [key, child] of Object.entries(claim)) checkClaim(child, `${pointer}/${key}`);
  }
  checkClaim(doc, '');
  assert.notEqual(doc.identity.displayNameJa, doc.identity.scientificName.value, `${id}: display/scientific over-merged`);
  assert(doc.identity.entityType !== 'unknown' || doc.identity.canonicalNameJa.status === 'unknown');
}

const signatures = Object.entries(docs).map(([id, doc]) => [id, JSON.stringify(doc.ecology.stableGeneral) + JSON.stringify(doc.sources)]);
for (let i = 0; i < signatures.length; i++) for (let j = i + 1; j < signatures.length; j++) assert.notEqual(signatures[i][1], signatures[j][1], `${signatures[i][0]} and ${signatures[j][0]} look mechanically copied`);

const negative = structuredClone(docs.aji);
negative.speciesId = 'seabass';
negative.identity.displayNameJa = 'シーバス';
assert.throws(() => {
  assert.notEqual(JSON.stringify(negative.ecology.stableGeneral), JSON.stringify(docs.aji.ecology.stableGeneral), 'negative fixture copied ecology after only identity changed');
}, /negative fixture/);

console.log('fish species ecology schema tests passed');
