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
  const localRequire = (specifier) => specifier.startsWith('@/') ? loadTsModule(`src/${specifier.slice(2)}.ts`) : nodeRequire(specifier);
  new Function('exports', 'require', 'module', outputText)(compiledModule.exports, localRequire, compiledModule);
  return compiledModule.exports;
}
function assert(condition, message) { if (!condition) { console.error(message); process.exit(1); } }
const scoreV2 = loadTsModule('src/domain/scoreV2.ts');
const spot = { id:'s', name:'港', areaName:'唐津湾', latitude:0, longitude:0, spotType:'漁港', shoreAccess:'足場良い', targetSpecies:['アジ'], recommendedMethods:['サビキ'], coordinatePrecision:'exact' };
const fullEnv = { forecastTime:'2026-07-18T06:00', weather:{ windSpeedKmh:10, precipitationMm:0, weatherCode:1 }, marine:{ seaSurfaceTemperatureCelsius:22, waveHeightMeters:0.5, seaLevelHeightMslMeters:1, oceanCurrentVelocityKmh:1 } };
const evidence = { directSpecies:{ score:100, confidence:'high', reason:'direct' }, habitat:{ score:100, confidence:'medium', reason:'habitat' }, catchHistory:{ score:100, confidence:'low', reason:'history' }, methodAffinity:{ score:100, confidence:'high', reason:'method' } };
const full = scoreV2.calculateScoreV2ForSpecies({ species:'アジ', spot, selectedDateTime:'2026-07-18T06:00', environmentRow:fullEnv, spotEvidence:evidence });
assert(full.spotCompatibilityScore === 74, 'confidence 100/60/30% should be applied per evidence item');
assert(full.environmentScore !== null && full.overallScore === Math.round(full.spotCompatibilityScore * 0.7 + full.environmentScore * 0.3), 'overall should use 70/30 spot/environment weights');
assert(full.coveragePercent === 100 && full.informationStatus === 'available', 'full data should be available');
const boundary = scoreV2.calculateScoreV2ForSpecies({ species:'アジ', spot, selectedDateTime:'2026-07-18T06:00', environmentRow:{ forecastTime:'2026-07-18T06:00', weather:{ precipitationMm:0 }, marine:{ seaSurfaceTemperatureCelsius:22, waveHeightMeters:0.5, seaLevelHeightMslMeters:null, oceanCurrentVelocityKmh:null } }, spotEvidence:{ directSpecies:evidence.directSpecies, habitat:null, catchHistory:evidence.catchHistory, methodAffinity:null } });
assert(boundary.spotCompatibilityScore === 77 && boundary.overallScore !== null, '60% coverage boundary should calculate from available items without zero-filling missing items');
const under = scoreV2.calculateScoreV2ForSpecies({ species:'アジ', spot, selectedDateTime:'2026-07-18T06:00', environmentRow:null, spotEvidence:{ directSpecies:evidence.directSpecies, habitat:null, catchHistory:null, methodAffinity:null } });
assert(under.overallScore === null && under.spotCompatibilityScore === 100 && under.informationStatus === 'reference_only', 'environment absence or under 60% coverage should return spot reference only');
for (const species of ['アジ', 'シーバス', 'チヌ']) {
  const result = scoreV2.calculateScoreV2ForSpecies({ species, spot:{...spot, targetSpecies:[species], recommendedMethods: species === 'シーバス' ? ['キャスティング'] : ['コマセ']}, selectedDateTime:'2026-07-18T06:00', environmentRow:fullEnv, spotEvidence:evidence });
  assert(result.overallScore !== null, `${species} should be calculable when inputs are complete`);
}
for (const species of scoreV2.SCORE_V2_UNRESEARCHED_SPECIES) {
  const result = scoreV2.calculateScoreV2ForSpecies({ species, spot, selectedDateTime:'2026-07-18T06:00', environmentRow:fullEnv });
  assert(result.informationStatus === 'no_information' && result.overallScore === null, `${species} should remain no_information`);
}
const speciesResults = [90,80,70,60].map((overallScore, i) => ({ species:['アジ','シーバス','チヌ','サバ'][i], overallScore }));
const method = scoreV2.calculateScoreV2ForMethod('サビキ', speciesResults, { score:100, confidence:'high', reason:'safe' });
assert(method.speciesAverageScore === 80 && method.contributingSpeciesCount === 3 && method.overallScore === 86, 'method score should use top 3 species average at 70% and spot suitability at 30%');
assert(scoreV2.calculateScoreV2ForMethod('サビキ', speciesResults.slice(0, 2), { score:100, confidence:'high', reason:'safe' }).contributingSpeciesCount === 2, 'method should support two contributing species');
assert(scoreV2.calculateScoreV2ForMethod('サビキ', speciesResults.slice(0, 1), { score:100, confidence:'high', reason:'safe' }).contributingSpeciesCount === 1, 'method should support one contributing species');
assert(scoreV2.calculateScoreV2ForMethod('サビキ', [], { score:100, confidence:'high', reason:'safe' }).informationStatus === 'reference_only', 'method should return no species average when zero species contribute');
assert(full.reasons.every((reason) => !String(reason.note).includes('http')), 'reasons should not expose source URLs');
console.log('SCORE v2 checks passed.');
