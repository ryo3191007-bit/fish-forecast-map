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
const fishing = loadTsModule('src/domain/fishing.ts');
const source = readFileSync(join(process.cwd(), 'src/domain/scoreV2.ts'), 'utf8');
const spot = { id:'s', name:'港', areaName:'唐津湾', latitude:0, longitude:0, spotType:'漁港', shoreAccess:'足場良い', targetSpecies:['マアジ'], recommendedMethods:['サビキ'], coordinatePrecision:'exact' };
const evidence = { directSpecies:{ score:100, confidence:'high', displayReason:'対象魚の承認済み実績', internalNote:'directSpecies implementation note https://internal.example/spot' }, habitat:{ score:100, confidence:'medium', internalNote:'habitat implementation note' }, catchHistory:{ score:100, confidence:'low', sourceUrl:'https://source.example/catches' }, methodAffinity:{ score:100, confidence:'high', displayReason:'釣法との承認済み相性' } };
const approvedEnvironment = { waterTemperature:{ score:80, confidence:'high', displayReason:'水温の承認済み評価', sourceUrl:'https://source.example/temp' }, tideCurrent:{ score:70, confidence:'medium', internalNote:'tide/current calculator memo' }, windWave:{ score:90, confidence:'medium' }, seasonTime:{ score:75, confidence:'low' }, weatherRain:{ score:70, confidence:'low', internalNote:'weatherRain internal note https://internal.example/rain' } };
const full = scoreV2.calculateScoreV2ForSpecies({ species:'マアジ', spot, selectedDateTime:'2026-07-18T06:00', spotEvidence:evidence, environmentEvidence:approvedEnvironment });
assert(full.spotCompatibilityScore === 74, 'confidence 100/60/30% should be applied per approved spot evidence item');
assert(full.environmentScore !== null && full.overallScore === Math.round((full.spotCompatibilityScore * scoreV2.SCORE_V2_TOTAL_WEIGHTS.spotCompatibility + full.environmentScore * scoreV2.SCORE_V2_TOTAL_WEIGHTS.environment) / (scoreV2.SCORE_V2_TOTAL_WEIGHTS.spotCompatibility + scoreV2.SCORE_V2_TOTAL_WEIGHTS.environment)), 'overall should use declared spot/environment weights');
assert(full.confidence.spot.high === 2 && full.confidence.spot.medium === 1 && full.confidence.spot.low === 1, 'spot confidence counts should be reported separately');
assert(full.confidence.environment.high === 1 && full.confidence.environment.medium === 2 && full.confidence.environment.low === 2, 'environment confidence counts should be reported separately');
assert(full.coverage.spotCompatibilityPercent === 100 && full.coverage.environmentPercent === 100 && full.coverage.overallPercent === 100 && full.informationStatus === 'available', 'full coverage should be available');
const legacyOnly = scoreV2.calculateScoreV2ForSpecies({ species:'マアジ', spot, selectedDateTime:'2026-07-18T06:00' });
assert(legacyOnly.spotCompatibilityScore === null && legacyOnly.environmentScore === null && legacyOnly.reasons.length === 0 && legacyOnly.informationStatus === 'no_information', 'legacy spot fields and raw environment values must not become approved SCORE v2 evidence');
const rawEnvironmentOnly = scoreV2.calculateScoreV2ForSpecies({ species:'マアジ', spot, selectedDateTime:'2026-07-18T06:00', spotEvidence:evidence });
assert(rawEnvironmentOnly.environmentScore === null && rawEnvironmentOnly.coverage.environmentPercent === 0 && !rawEnvironmentOnly.reasons.some((reason) => reason.label.includes(':')), 'environmentEvidence absence must not create water temperature, tide/current, or weather-code fallback scores');
const boundary = scoreV2.calculateScoreV2ForSpecies({ species:'マアジ', spot, selectedDateTime:'2026-07-18T06:00', spotEvidence:{ directSpecies:evidence.directSpecies, habitat:null, catchHistory:evidence.catchHistory, methodAffinity:null }, environmentEvidence:{ waterTemperature:approvedEnvironment.waterTemperature, tideCurrent:null, windWave:approvedEnvironment.windWave, seasonTime:approvedEnvironment.seasonTime, weatherRain:null } });
assert(boundary.coverage.spotCompatibilityPercent === 60 && boundary.coverage.environmentPercent === 65 && boundary.overallScore !== null, '60% spot coverage boundary should calculate from approved available items');
const missingEnvironment = scoreV2.calculateScoreV2ForSpecies({ species:'マアジ', spot, selectedDateTime:'2026-07-18T06:00', spotEvidence:evidence, environmentEvidence:{ waterTemperature:null, tideCurrent:null, windWave:null, seasonTime:null, weatherRain:null } });
assert(missingEnvironment.environmentScore === null && missingEnvironment.coverage.environmentPercent === 0 && missingEnvironment.overallScore === null && missingEnvironment.coverage.overallPercent === 0, 'explicitly missing environment evidence must stay unknown instead of being treated as 0');
const under = scoreV2.calculateScoreV2ForSpecies({ species:'マアジ', spot, selectedDateTime:'2026-07-18T06:00', spotEvidence:{ directSpecies:evidence.directSpecies, habitat:null, catchHistory:null, methodAffinity:null } });
assert(under.overallScore === null && under.spotCompatibilityScore === 100 && under.coverage.spotCompatibilityPercent === 40 && under.coverage.environmentPercent === 0 && under.informationStatus === 'reference_only', 'insufficient environment should return a spot-side reference result with truthful coverage');
for (const species of ['マアジ', 'スズキ', 'チヌ']) {
  const result = scoreV2.calculateScoreV2ForSpecies({ species, spot:{...spot, targetSpecies:[species], recommendedMethods: species === 'スズキ' ? ['キャスティング'] : ['コマセ']}, selectedDateTime:'2026-07-18T06:00', spotEvidence:evidence, environmentEvidence:approvedEnvironment });
  assert(result.overallScore !== null, `${species} should be calculable when approved inputs are complete`);
}
for (const species of scoreV2.SCORE_V2_UNRESEARCHED_SPECIES) {
  const result = scoreV2.calculateScoreV2ForSpecies({ species, spot, selectedDateTime:'2026-07-18T06:00', spotEvidence:evidence, environmentEvidence:approvedEnvironment });
  assert(result.informationStatus === 'no_information' && result.overallScore === null, `${species} should remain no_information`);
}
assert(scoreV2.SCORE_V2_UNRESEARCHED_SPECIES.length === fishing.fishSpeciesNames.length - 3, 'every species except the three researched species should be no_information');
const speciesResults = [90,80,70,60].map((overallScore, i) => ({ species:['マアジ','スズキ','チヌ','サバ'][i], overallScore }));
const suitability = { score:100, confidence:'high', displayReason:'承認済みの集約済み釣り場適性', internalNote:'approved aggregate spot suitability https://internal.example/method' };
const methodZero = scoreV2.calculateScoreV2ForMethod('サビキ', speciesResults, { 'サビキ':[] }, suitability);
const methodOne = scoreV2.calculateScoreV2ForMethod('サビキ', speciesResults, { 'サビキ':['マアジ'] }, suitability);
const methodTwo = scoreV2.calculateScoreV2ForMethod('サビキ', speciesResults, { 'サビキ':['マアジ','チヌ'] }, suitability);
const methodThree = scoreV2.calculateScoreV2ForMethod('サビキ', speciesResults, { 'サビキ':['マアジ','スズキ','チヌ'] }, suitability);
const methodFour = scoreV2.calculateScoreV2ForMethod('サビキ', speciesResults, { 'サビキ':['マアジ','スズキ','チヌ','サバ'] }, suitability);
assert(methodZero.informationStatus === 'no_information' && methodZero.overallScore === null, 'zero compatible species should be no_information');
assert(methodOne.contributingSpeciesCount === 1 && methodOne.speciesAverageScore === 90 && methodOne.overallScore === 93, 'one compatible species should use that species at 70% plus aggregate spot suitability at 30%');
assert(methodTwo.contributingSpecies.join(',') === 'マアジ,チヌ' && methodTwo.speciesAverageScore === 80 && methodTwo.overallScore === 86, 'two compatible species should average both contributing species');
assert(methodThree.contributingSpecies.join(',') === 'マアジ,スズキ,チヌ' && methodThree.speciesAverageScore === 80 && methodThree.overallScore === 86, 'three compatible species should average all three');
assert(methodFour.contributingSpecies.join(',') === 'マアジ,スズキ,チヌ' && methodFour.speciesAverageScore === 80, 'more than three compatible species should use only top three scores');
const noScores = scoreV2.calculateScoreV2ForMethod('サビキ', [], { 'サビキ':['マアジ'] }, suitability);
assert(noScores.informationStatus === 'reference_only' && noScores.spotSuitabilityScore === 100, 'compatible species with no species scores can return aggregate spot-suitability reference');
assert(full.reasons.every((reason) => !Object.hasOwn(reason, 'internalNote') && !Object.hasOwn(reason, 'sourceUrl') && !Object.hasOwn(reason, 'note')), 'user-facing reasons should be separated from internal/source notes at the output type level');
assert(full.reasons.every((reason) => !String(reason.displayNote).includes('http') && !String(reason.displayNote).includes('implementation note') && !String(reason.displayNote).includes('calculator memo')), 'reasons should not expose source URLs or unrestricted internal implementation notes');
assert(full.reasons.some((reason) => reason.label === '対象魚の実績') && full.reasons.some((reason) => reason.label === '水温'), 'reason labels should use short Japanese display labels');
assert(full.reasons.every((reason) => !reason.label.includes(':') && !reason.label.includes('directSpecies') && !reason.label.includes('waterTemperature')), 'reason labels should not expose internal evidence keys');
assert(!source.includes('SCORE_V2_SPOT_SUITABILITY_WEIGHTS') && !source.includes('footing: 25') && !source.includes('depth: 20') && !source.includes('terrain: 20') && !source.includes('lighting: 15') && !source.includes('access: 10') && !source.includes('safety: 10'), 'unapproved internal spot suitability weighting must not remain in code');
assert(!source.includes('temp >= 16') && !source.includes('score: 65') && !source.includes('score: 60') && !source.includes('weatherCode'), 'unapproved raw-environment fallback scoring must not remain in code');
assert(!source.includes(' * 0.7') && !source.includes(' * 0.3'), 'overall calculations must derive ratios from declared weight constants instead of hard-coded decimals');
console.log('SCORE v2 checks passed.');
