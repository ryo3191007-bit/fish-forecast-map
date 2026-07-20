import type { EnvironmentForecastRow, FishingEnvironment } from "@/domain/environment";
import type { ExternalCatchRecord } from "@/domain/externalCatch";
import { fishSpeciesNames, type FishSpeciesName, type FishingMethod } from "@/domain/fishing";
import type { FishingSpot } from "@/domain/fishingSpot";
import type { FishingSpotDetailSet, SpotDetailConfidence, SpotDetailValue } from "@/domain/fishingSpotDetail";
import {
  calculateScoreV2ForMethod,
  calculateScoreV2ForSpecies,
  SCORE_V2_SUPPORTED_SPECIES,
  type ScoreEvidence,
  type ScoreV2MethodCompatibility,
  type ScoreV2MethodResult,
  type ScoreV2SpeciesInput,
  type ScoreV2SpeciesResult,
} from "@/domain/scoreV2";

type SupportedSpecies = (typeof SCORE_V2_SUPPORTED_SPECIES)[number];
type TideState = "上げ潮" | "満潮前後" | "下げ潮" | "干潮前後";
export type ScoreV2UnsafeReason = "強風" | "突風" | "高波" | "大雨" | "雷雨";
export type ScoreV2SafetyStatus = "safe" | "unsafe" | "unknown";
export type ScoreV2ProductionResult =
  | { status: "available"; safetyStatus: "safe"; unsafeReasons: []; speciesResults: ScoreV2SpeciesResult[]; methodResults: ScoreV2MethodResult[] }
  | { status: "unsafe"; safetyStatus: "unsafe"; unsafeReasons: ScoreV2UnsafeReason[]; displayMessage: "危険な可能性があるため評価対象外"; speciesResults: ScoreV2SpeciesResult[]; methodResults: ScoreV2MethodResult[] }
  | { status: "safety_unknown"; safetyStatus: "unknown"; unsafeReasons: []; displayMessage: "安全情報を確認できないため評価対象外"; speciesResults: ScoreV2SpeciesResult[]; methodResults: ScoreV2MethodResult[] };

const methods: FishingMethod[] = ["ジギング", "キャスティング", "コマセ", "泳がせ", "サビキ", "エギング", "その他"];
const METHOD_AFFINITY: Record<FishingMethod, Record<SupportedSpecies, number | null>> = {
  ジギング: { アジ: 60, シーバス: 80, チヌ: null }, キャスティング: { アジ: 80, シーバス: 100, チヌ: 80 },
  コマセ: { アジ: 100, シーバス: null, チヌ: 100 }, 泳がせ: { アジ: null, シーバス: 100, チヌ: null },
  サビキ: { アジ: 100, シーバス: null, チヌ: null }, エギング: { アジ: null, シーバス: null, チヌ: null }, その他: { アジ: null, シーバス: null, チヌ: null },
};
export const SCORE_V2_METHOD_COMPATIBILITY = Object.fromEntries(methods.map((method) => [method, SCORE_V2_SUPPORTED_SPECIES.filter((species) => METHOD_AFFINITY[method][species] !== null)])) as ScoreV2MethodCompatibility;

const habitatScores: Record<SupportedSpecies, Record<string, number>> = {
  アジ: { artificial_reef:100, rocky:100, structure:100, open_sea:100, fishing_port:90, breakwater:90, inner_bay:80, good_tidal_flow:80, estuary:60, sand_mud:60, beach:60 },
  シーバス: { estuary:100, brackish:100, river_influence:100, seaweed_bed:100, beach:100, inner_bay:90, fishing_port:90, sand_mud:90, structure:80, open_sea:60, rocky:60 },
  チヌ: { estuary:100, inner_bay:100, tidal_flat:100, sand_mud:100, shell_bottom:100, fishing_port:90, breakwater:90, rocky:80, structure:80, open_sea:60, beach:60 },
};
const habitatGroups = [
  { weight:40, keys:["coastal_topography", "water_flow_influences"] },
  { weight:35, keys:["spot_features"] },
  { weight:25, keys:["bottom_material", "obstacles"] },
];
const featureAliases: Record<string,string> = { "open_sea_exposure:open_sea":"open_sea", "tidal_flow:good":"good_tidal_flow", "river_influence:present":"river_influence", sandy_beach:"beach", port:"fishing_port", harbor:"fishing_port" };
const shapeScores: Partial<Record<FishingMethod,Record<string,number>>> = {
  ジギング:{breakwater:100,rocky_shore:100,open_sea:100,fishing_port:80,quay:80,beach:80,inner_bay:60,estuary:60},
  キャスティング:{beach:100,estuary:100,open_sea:100,fishing_port:80,breakwater:80,quay:80,rocky_shore:80,inner_bay:60},
  コマセ:{fishing_port:100,breakwater:100,quay:100,rocky_shore:80,inner_bay:80,beach:60,estuary:60},
  泳がせ:{fishing_port:100,breakwater:100,quay:100,rocky_shore:80,beach:80,inner_bay:80,open_sea:80,estuary:60},
  サビキ:{fishing_port:100,breakwater:100,quay:100,inner_bay:80,rocky_shore:60}, エギング:{fishing_port:100,breakwater:100,rocky_shore:100,quay:80,inner_bay:80,open_sea:80,beach:60},
};
const terrainScores: Partial<Record<FishingMethod,Record<string,number>>> = {
  ジギング:{open_sea:100,good_tidal_flow:100,rocky:100,structure:100,inner_bay:60,sand:80,estuary:60,river_influence:60},
  キャスティング:{open_sea:100,good_tidal_flow:100,inner_bay:80,rocky:80,structure:80,sand:100,estuary:100,river_influence:100},
  コマセ:{open_sea:80,good_tidal_flow:80,inner_bay:100,rocky:80,structure:80,sand:60,estuary:80,river_influence:80},
  泳がせ:{open_sea:80,good_tidal_flow:80,inner_bay:80,rocky:80,structure:80,sand:80,estuary:80,river_influence:80},
  サビキ:{open_sea:80,good_tidal_flow:80,inner_bay:100,rocky:60,structure:60,estuary:60,river_influence:60},
  エギング:{open_sea:80,good_tidal_flow:80,inner_bay:80,rocky:100,structure:100,sand:60,estuary:60,river_influence:60},
};

function approved(value: SpotDetailValue) {
  return value.adoptionStatus === "adopted" && value.reviewStatus === "reviewed" &&
    ((value.contributionOrigin === "curated_research" && value.moderationStatus === "not_required") || (value.contributionOrigin === "user_contribution" && value.moderationStatus === "approved")) &&
    (value.informationState === "has_evidence" || value.informationState === "weak_evidence") && value.confidence !== null && value.sources.some(({ relation }) => relation === "supporting");
}
const valuesFor = (details: FishingSpotDetailSet | null | undefined, key: string) => (details?.values ?? []).filter((value) => value.itemKey === key && approved(value));
const tokens = (value: SpotDetailValue) => [...value.valueTextList, ...(value.valueText ? [value.valueText] : [])];
const confidenceRank: Record<SpotDetailConfidence,number> = { low:0, medium:1, high:2 };
const lowestConfidence = (values: SpotDetailValue[], cap: SpotDetailConfidence): SpotDetailConfidence => {
  const lowest = values.map((v) => v.confidence!).sort((a,b) => confidenceRank[a]-confidenceRank[b])[0] ?? "low";
  return confidenceRank[lowest] > confidenceRank[cap] ? cap : lowest;
};
const evidence = (score:number, confidence:SpotDetailConfidence, displayReason:string): ScoreEvidence => ({ score, confidence, displayReason });

function directSpecies(details: FishingSpotDetailSet | null | undefined, species: SupportedSpecies) {
  const candidates = valuesFor(details, "target_species");
  if (candidates.length !== 1 || !tokens(candidates[0]).includes(species)) return null;
  return evidence(100, candidates[0].confidence!, `${species}を対象とする承認済み情報があります`);
}
function habitat(details: FishingSpotDetailSet | null | undefined, species: SupportedSpecies) {
  const used: SpotDetailValue[] = []; let availableWeight=0; let total=0;
  for (const group of habitatGroups) {
    const candidates = group.keys.flatMap((key) => valuesFor(details,key)).flatMap((value) => tokens(value).map((token) => ({ value, score: habitatScores[species][featureAliases[token] ?? token] })) ).filter((x) => x.score !== undefined);
    if (!candidates.length) continue;
    candidates.sort((a,b) => b.score-a.score); used.push(candidates[0].value); availableWeight += group.weight; total += candidates[0].score*group.weight;
  }
  if (availableWeight < 60) return null;
  return evidence(Math.round(total/availableWeight), lowestConfidence(used,"medium"), "承認済みの地形・水域特性を反映しています");
}
function catchHistory(records: ExternalCatchRecord[], spotId:string, species:SupportedSpecies, selected:string) {
  const end = new Date(selected).getTime(), start = end - 3*365.25*86400000;
  const eligible = records.filter((r) => r.spotId===spotId && r.species===species && r.acquisitionMethod==="manual" && r.confidence!=="low" && r.sourceUrl && Number.isFinite(new Date(r.caughtDate).getTime()) && new Date(r.caughtDate).getTime() <= end && new Date(r.caughtDate).getTime() >= start);
  const unique = new Map(eligible.map((r) => [`${r.caughtDate.slice(0,10)}|${r.sourceUrl}`,r]));
  const count = new Set([...unique.values()].map((r) => r.caughtDate.slice(0,10))).size;
  if (!count) return null;
  const sourceCount = new Set([...unique.values()].map((r) => r.sourceUrl)).size;
  const confidence:SpotDetailConfidence = count>=3 && sourceCount>=2 ? "high" : count>=2 || [...unique.values()].some((r)=>r.confidence==="high") ? "medium" : "low";
  return evidence(count>=3?100:count===2?90:80, confidence, `過去3年以内の確認済み釣果日を${count}日分反映しています`);
}
function methodAffinity(details:FishingSpotDetailSet|null|undefined,species:SupportedSpecies) {
  const values=valuesFor(details,"recommended_methods");
  if (values.length!==1) return null;
  const scores=tokens(values[0]).map((method)=>METHOD_AFFINITY[method as FishingMethod]?.[species]).filter((score):score is number=>typeof score==="number");
  return scores.length ? evidence(Math.max(...scores),"medium","承認済みの推奨釣法との相性を反映しています") : null;
}

export function buildMethodSpotSuitability(details:FishingSpotDetailSet|null|undefined, method:FishingMethod):ScoreEvidence|null {
  const unavailable=[...valuesFor(details,"restriction_status"),...valuesFor(details,"shore_access")].some((v)=>tokens(v).some((t)=>["fishing_prohibited","entry_prohibited","closed","shore_inaccessible","unsafe_unavailable"].includes(t)));
  if(unavailable)return null;
  if(method==="その他")return null;
  const groups:{weight:number;values:SpotDetailValue[];scores:Record<string,number>|undefined}[]=[
    {weight:55,values:valuesFor(details,"spot_features"),scores:shapeScores[method]},
    {weight:30,values:[...valuesFor(details,"coastal_topography"),...valuesFor(details,"water_flow_influences"),...valuesFor(details,"bottom_material"),...valuesFor(details,"obstacles")],scores:terrainScores[method]},
    {weight:15,values:valuesFor(details,"shore_access"),scores:{stable:100,partially_constrained:80,difficult:60}},
  ];
  let weight=0,total=0;const used:SpotDetailValue[]=[];
  for(const group of groups){const candidates=group.values.flatMap((value)=>tokens(value).map((token)=>({value,score:group.scores?.[featureAliases[token]??token]}))).filter((x):x is {value:SpotDetailValue;score:number}=>typeof x.score==="number").sort((a,b)=>b.score-a.score);if(candidates[0]){weight+=group.weight;total+=candidates[0].score*group.weight;used.push(candidates[0].value);}}
  return weight>=60?evidence(Math.round(total/weight),lowestConfidence(used,"medium"),"承認済みの地点形状・地形・足場を反映しています"):null;
}

const temperatureScore = (species:SupportedSpecies,t:number) => {
  if (species==="アジ") return t<9?20:t<15?40:t<18?60:t<22?80:t<=26?100:t<=28?80:t<=30?60:t<=32?40:20;
  if (species==="シーバス") return t<6?20:t<12?40:t<17?60:t<21?80:t<=27?100:t<30?80:t<33?40:20;
  return t<10?20:t<15?40:t<20?60:t<23?80:t<=29?100:t<=32?60:t<=35?40:20;
};
const tideScores:Record<SupportedSpecies,Record<TideState,number>>={ アジ:{上げ潮:80,満潮前後:70,下げ潮:60,干潮前後:60}, シーバス:{上げ潮:80,満潮前後:70,下げ潮:70,干潮前後:60}, チヌ:{上げ潮:80,満潮前後:80,下げ潮:70,干潮前後:60} };
function tideState(rows:EnvironmentForecastRow[],selected:string):TideState|null { const index=rows.findIndex((r)=>r.forecastTime===selected); if(index<1||index>=rows.length-1)return null; const p=rows[index-1].marine?.seaLevelHeightMslMeters,c=rows[index].marine?.seaLevelHeightMslMeters,n=rows[index+1].marine?.seaLevelHeightMslMeters; if(p==null||c==null||n==null)return null; if(p<c&&n<=c)return "満潮前後"; if(p>c&&n>=c)return "干潮前後"; if(p===n)return null; return n>p?"上げ潮":"下げ潮"; }
function unsafeReasons(row:EnvironmentForecastRow):ScoreV2UnsafeReason[]{ const reasons:ScoreV2UnsafeReason[]=[]; if(row.weather?.windSpeedKmh!=null&&row.weather.windSpeedKmh>=36)reasons.push("強風"); if(row.weather?.windGustKmh!=null&&row.weather.windGustKmh>=72)reasons.push("突風"); if(row.marine?.waveHeightMeters!=null&&row.marine.waveHeightMeters>=1.25)reasons.push("高波"); if(row.weather?.precipitationMm!=null&&row.weather.precipitationMm>=30)reasons.push("大雨"); if(row.weather?.weatherCode!=null&&[95,96,99].includes(row.weather.weatherCode))reasons.push("雷雨"); return reasons; }
function hasCompleteSafetyData(row:EnvironmentForecastRow) { return row.weather?.windSpeedKmh != null && row.weather.windGustKmh != null && row.weather.precipitationMm != null && row.weather.weatherCode != null && row.marine?.waveHeightMeters != null; }
function environmentEvidence(environment:FishingEnvironment|null,selected:string,species:SupportedSpecies) {
  const empty={waterTemperature:null,tideCurrent:null,windWave:null,seasonTime:null,weatherRain:null};
  if(!environment||environment.cacheStatus==="cache-stale")return { evidence:empty,unsafe:[] as ScoreV2UnsafeReason[] };
  const row=environment.hourly.find((r)=>r.forecastTime===selected); if(!row)return {evidence:empty,unsafe:[] as ScoreV2UnsafeReason[]};
  const unsafe=unsafeReasons(row); const temp=row.marine?.seaSurfaceTemperatureCelsius; const tide=tideState(environment.hourly,selected);
  const windScores:number[]=[]; const w=row.weather?.windSpeedKmh; if(w!=null)windScores.push(w<10.8?100:w<21.6?90:w<28.8?70:w<36?40:0); const gust=row.weather?.windGustKmh; if(gust!=null)windScores.push(gust<36?100:gust<54?80:gust<72?50:0); const wave=row.marine?.waveHeightMeters; if(wave!=null)windScores.push(wave<=.3?100:wave<=.6?90:wave<=.9?70:wave<1.25?40:0);
  const rain=row.weather?.precipitationMm; const rainScore=rain==null?null:rain===0?100:rain<3?90:rain<10?80:rain<20?60:rain<30?40:null;
  const date=selected.slice(0,10),sun=environment.dailySun.find((d)=>d.date===date); let timeScore:number|null=null; if(sun){const t=new Date(selected).getTime(),rise=new Date(sun.sunrise).getTime(),set=new Date(sun.sunset).getTime(); const band=3600000; const period=Math.abs(t-rise)<=band?"朝":Math.abs(t-set)<=band?"夕":t>rise&&t<set?"昼":"夜"; timeScore=({アジ:{朝:100,昼:70,夕:100,夜:90},シーバス:{朝:90,昼:70,夕:100,夜:90},チヌ:{朝:90,昼:90,夕:90,夜:70}} as const)[species][period];}
  return {unsafe,evidence:{ waterTemperature:temp==null?null:evidence(temperatureScore(species,temp),"medium","選択時刻の海面水温を反映しています"), tideCurrent:tide?evidence(tideScores[species][tide],"low",`${tide}の参考値を反映しています`):null, windWave:windScores.length?evidence(Math.min(...windScores),"low",windScores.length<3?"取得済みの風・波を反映しています（一部情報未反映）":"選択時刻の風・波を反映しています"):null, seasonTime:timeScore==null?null:evidence(timeScore,species==="アジ"?"medium":"low","日の出・日の入りに基づく時間帯を反映しています"), weatherRain:rainScore==null?null:evidence(rainScore,"low","選択時刻の1時間降水量を反映しています") }};
}

export function buildScoreV2SpeciesInput(args:{species:FishSpeciesName;spot:FishingSpot;details?:FishingSpotDetailSet|null;catches?:ExternalCatchRecord[];environment?:FishingEnvironment|null;selectedDateTime:string}):ScoreV2SpeciesInput {
  const {species}=args; if(!SCORE_V2_SUPPORTED_SPECIES.includes(species as SupportedSpecies))return {species,spot:args.spot,selectedDateTime:args.selectedDateTime}; const supported=species as SupportedSpecies;
  return {species,spot:args.spot,selectedDateTime:args.selectedDateTime,spotEvidence:{directSpecies:directSpecies(args.details,supported),habitat:habitat(args.details,supported),catchHistory:catchHistory(args.catches??[],args.spot.id,supported,args.selectedDateTime),methodAffinity:methodAffinity(args.details,supported)},environmentEvidence:environmentEvidence(args.environment??null,args.selectedDateTime,supported).evidence};
}

export function calculateProductionScoreV2(args:{spot:FishingSpot;details?:FishingSpotDetailSet|null;catches?:ExternalCatchRecord[];environment?:FishingEnvironment|null;selectedDateTime:string}):ScoreV2ProductionResult {
  const speciesResults=fishSpeciesNames.map((species)=>calculateScoreV2ForSpecies(buildScoreV2SpeciesInput({...args,species})));
  const selected=args.environment?.cacheStatus!=="cache-stale"?args.environment?.hourly.find((r)=>r.forecastTime===args.selectedDateTime):undefined; const unsafe=selected?unsafeReasons(selected):[];
  const methodResults=methods.map((method)=>calculateScoreV2ForMethod(method,speciesResults,SCORE_V2_METHOD_COMPATIBILITY,buildMethodSpotSuitability(args.details,method)));
  const withoutScores=()=>({speciesResults:speciesResults.map((r)=>({...r,overallScore:null})),methodResults:methodResults.map((r)=>({...r,overallScore:null}))});
  if(unsafe.length)return {status:"unsafe",safetyStatus:"unsafe",unsafeReasons:unsafe,displayMessage:"危険な可能性があるため評価対象外",...withoutScores()};
  if(!selected||!hasCompleteSafetyData(selected))return {status:"safety_unknown",safetyStatus:"unknown",unsafeReasons:[],displayMessage:"安全情報を確認できないため評価対象外",...withoutScores()};
  return {status:"available",safetyStatus:"safe",unsafeReasons:[],speciesResults,methodResults};
}
