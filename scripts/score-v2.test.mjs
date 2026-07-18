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
const full = scoreV2.calculateScoreV2ForSpecies({ species:'アジ', spot, selectedDateTime:'2026-07-18T06:00', environmentRow:fullEnv, spotEvidence:evidence, environmentEvidence:{ waterTemperature:{ score:80, confidence:'high', reason:'approved temp' }, tideCurrent:{ score:70, confidence:'medium', reason:'approved tide' }, windWave:{ score:90, confidence:'medium', reason:'approved wind/wave' }, seasonTime:{ score:75, confidence:'low', reason:'approved season/time' }, weatherRain:{ score:70, confidence:'low', reason:'approved rain' } } });
assert(full.spotCompatibilityScore === 74, 'confidence 100/60/30% should be applied per approved spot evidence item');
assert(full.environmentScore !== null && full.overallScore === Math.round(full.spotCompatibilityScore * 0.7 + full.environmentScore * 0.3), 'overall should use 70/30 spot/environment weights');
assert(full.coverage.spotCompatibilityPercent === 100 && full.coverage.environmentPercent === 100 && full.coverage.overallPercent === 100 && full.informationStatus === 'available', 'full coverage should be available');
const legacyOnly = scoreV2.calculateScoreV2ForSpecies({ species:'アジ', spot, selectedDateTime:'2026-07-18T06:00', environmentRow:fullEnv });
assert(legacyOnly.spotCompatibilityScore === null && legacyOnly.informationStatus === 'no_information', 'legacy spot target/method/type fields must not become approved SCORE v2 spot evidence');
const boundary = scoreV2.calculateScoreV2ForSpecies({ species:'アジ', spot, selectedDateTime:'2026-07-18T06:00', environmentRow:{ forecastTime:'2026-07-18T06:00', weather:{ precipitationMm:0 }, marine:{ seaSurfaceTemperatureCelsius:22, waveHeightMeters:0.5, seaLevelHeightMslMeters:null, oceanCurrentVelocityKmh:null } }, spotEvidence:{ directSpecies:evidence.directSpecies, habitat:null, catchHistory:evidence.catchHistory, methodAffinity:null } });
assert(boundary.coverage.spotCompatibilityPercent === 60 && boundary.coverage.environmentPercent === 60 && boundary.overallScore !== null, '60% coverage boundary should calculate from available items');
const waveOnly = scoreV2.calculateScoreV2ForSpecies({ species:'アジ', spot, selectedDateTime:'2026-07-18T06:00', environmentRow:{ forecastTime:'2026-07-18T06:00', weather:{}, marine:{ waveHeightMeters:2 } }, spotEvidence:evidence });
assert(waveOnly.reasons.some((reason) => reason.label === '環境:windWave' && reason.points === 45), 'one-sided wave data should evaluate without substituting missing wind as 0');
assert(waveOnly.environmentScore === 14 && waveOnly.overallScore === null && waveOnly.coverage.environmentPercent === 20 && waveOnly.coverage.overallPercent === 0 && waveOnly.coveragePercent === 0, 'environment below threshold should not report overall coverage as complete');
const under = scoreV2.calculateScoreV2ForSpecies({ species:'アジ', spot, selectedDateTime:'2026-07-18T06:00', environmentRow:null, spotEvidence:{ directSpecies:evidence.directSpecies, habitat:null, catchHistory:null, methodAffinity:null } });
assert(under.overallScore === null && under.spotCompatibilityScore === 100 && under.coverage.spotCompatibilityPercent === 40 && under.coverage.environmentPercent === 0 && under.informationStatus === 'reference_only', 'insufficient environment should return a spot-side reference result with truthful coverage');
for (const species of ['アジ', 'シーバス', 'チヌ']) {
  const result = scoreV2.calculateScoreV2ForSpecies({ species, spot:{...spot, targetSpecies:[species], recommendedMethods: species === 'シーバス' ? ['キャスティング'] : ['コマセ']}, selectedDateTime:'2026-07-18T06:00', environmentRow:fullEnv, spotEvidence:evidence, environmentEvidence:{ waterTemperature:evidence.directSpecies, tideCurrent:evidence.habitat, windWave:evidence.catchHistory, seasonTime:evidence.methodAffinity, weatherRain:evidence.catchHistory } });
  assert(result.overallScore !== null, `${species} should be calculable when approved inputs are complete`);
}
for (const species of scoreV2.SCORE_V2_UNRESEARCHED_SPECIES) {
  const result = scoreV2.calculateScoreV2ForSpecies({ species, spot, selectedDateTime:'2026-07-18T06:00', environmentRow:fullEnv, spotEvidence:evidence });
  assert(result.informationStatus === 'no_information' && result.overallScore === null, `${species} should remain no_information`);
}
const speciesResults = [90,80,70,60].map((overallScore, i) => ({ species:['アジ','シーバス','チヌ','サバ'][i], overallScore }));
const suitability = { footing:{ score:100, confidence:'high', reason:'footing' }, depth:{ score:100, confidence:'high', reason:'depth' }, terrain:{ score:100, confidence:'high', reason:'terrain' }, lighting:{ score:100, confidence:'high', reason:'lighting' }, access:{ score:100, confidence:'high', reason:'access' }, safety:{ score:100, confidence:'high', reason:'safety' } };
const method = scoreV2.calculateScoreV2ForMethod('サビキ', speciesResults, { 'サビキ':['アジ','チヌ'] }, suitability);
assert(method.contributingSpecies.join(',') === 'アジ,チヌ' && method.speciesAverageScore === 80 && method.contributingSpeciesCount === 2 && method.overallScore === 86, 'method compatibility should filter contributing species before top averaging');
assert(scoreV2.calculateScoreV2ForMethod('サビキ', speciesResults, {}, suitability).informationStatus === 'no_information', 'zero compatible species should be no_information rather than spot reference');
const noScores = scoreV2.calculateScoreV2ForMethod('サビキ', [], { 'サビキ':['アジ'] }, suitability);
assert(noScores.informationStatus === 'reference_only' && noScores.spotSuitabilityScore === 100, 'compatible species with no species scores can return spot-side reference');
assert(full.reasons.every((reason) => !String(reason.note).includes('http')), 'reasons should not expose source URLs');
console.log('SCORE v2 checks passed.');
