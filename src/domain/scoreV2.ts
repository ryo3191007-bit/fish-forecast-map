import type { EnvironmentForecastRow } from "@/domain/environment";
import { fishSpeciesNames, type FishSpeciesName, type FishingMethod } from "@/domain/fishing";
import type { FishingSpot } from "@/domain/fishingSpot";
import type { FishingSpotDetailSet, SpotDetailConfidence, SpotDetailValue } from "@/domain/fishingSpotDetail";

export type ScoreV2InformationStatus = "available" | "partial" | "reference_only" | "no_information";
export type ScoreV2Confidence = Exclude<SpotDetailConfidence, null>;
export type ScoreV2Reason = { label: string; points: number; weight: number; confidence?: ScoreV2Confidence; note: string };

export type ScoreV2SpeciesResult = {
  species: FishSpeciesName;
  selectedDateTime: string;
  overallScore: number | null;
  spotCompatibilityScore: number | null;
  environmentScore: number | null;
  confidence: { high: number; medium: number; low: number };
  coveragePercent: number;
  partialData: boolean;
  informationStatus: ScoreV2InformationStatus;
  reasons: ScoreV2Reason[];
};

export type ScoreV2MethodResult = {
  method: FishingMethod;
  overallScore: number | null;
  spotSuitabilityScore: number | null;
  speciesAverageScore: number | null;
  contributingSpecies: FishSpeciesName[];
  contributingSpeciesCount: number;
  partialData: boolean;
  informationStatus: ScoreV2InformationStatus;
  reasons: ScoreV2Reason[];
};

type ScoreEvidence = { score: number; confidence: ScoreV2Confidence; reason: string };
export type ScoreV2SpeciesInput = {
  species: FishSpeciesName;
  spot: FishingSpot;
  details?: FishingSpotDetailSet | null;
  selectedDateTime: string;
  environmentRow?: EnvironmentForecastRow | null;
  spotEvidence?: Partial<Record<"directSpecies" | "habitat" | "catchHistory" | "methodAffinity", ScoreEvidence | null>>;
};

export const SCORE_V2_SUPPORTED_SPECIES = ["アジ", "シーバス", "チヌ"] as const satisfies readonly FishSpeciesName[];
export const SCORE_V2_UNRESEARCHED_SPECIES = fishSpeciesNames.filter(
  (species) => !SCORE_V2_SUPPORTED_SPECIES.includes(species as (typeof SCORE_V2_SUPPORTED_SPECIES)[number]),
);

export const SCORE_V2_CONFIDENCE_COEFFICIENT: Record<ScoreV2Confidence, number> = { high: 1, medium: 0.6, low: 0.3 };
export const SCORE_V2_TOTAL_WEIGHTS = { spotCompatibility: 70, environment: 30 } as const;
export const SCORE_V2_SPOT_WEIGHTS = { directSpecies: 40, habitat: 30, catchHistory: 20, methodAffinity: 10 } as const;
export const SCORE_V2_ENVIRONMENT_WEIGHTS = { waterTemperature: 30, tideCurrent: 25, windWave: 20, seasonTime: 15, weatherRain: 10 } as const;
export const SCORE_V2_MIN_COVERAGE_PERCENT = 60;

const clampScoreV2 = (score: number) => Math.max(0, Math.min(100, Math.round(score)));
const isSupportedSpecies = (species: FishSpeciesName) => SCORE_V2_SUPPORTED_SPECIES.includes(species as (typeof SCORE_V2_SUPPORTED_SPECIES)[number]);

function weightedAverage(items: { weight: number; evidence: ScoreEvidence | null | undefined; label: string }[]) {
  const available = items.filter((item): item is { weight: number; evidence: ScoreEvidence; label: string } => Boolean(item.evidence));
  const availableWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const coveragePercent = Math.round((availableWeight / totalWeight) * 100);
  if (availableWeight === 0) return { score: null, coveragePercent, partialData: true, reasons: [] as ScoreV2Reason[], confidence: { high: 0, medium: 0, low: 0 } };

  const confidence = { high: 0, medium: 0, low: 0 };
  const reasons = available.map(({ weight, evidence, label }) => {
    confidence[evidence.confidence] += 1;
    return { label, points: clampScoreV2(evidence.score), weight, confidence: evidence.confidence, note: evidence.reason };
  });
  const raw = available.reduce((sum, { weight, evidence }) => sum + clampScoreV2(evidence.score) * weight * SCORE_V2_CONFIDENCE_COEFFICIENT[evidence.confidence], 0) / availableWeight;
  return { score: clampScoreV2(raw), coveragePercent, partialData: coveragePercent < 100, reasons, confidence };
}

function hasConcreteDetail(details: FishingSpotDetailSet | null | undefined, itemKey: string, matcher: (value: SpotDetailValue) => boolean) {
  return details?.values.some((value) => value.itemKey === itemKey && value.informationState !== "researched_unknown" && value.informationState !== "unresearched" && matcher(value)) ?? false;
}

function buildSpotEvidence(input: ScoreV2SpeciesInput): Required<NonNullable<ScoreV2SpeciesInput["spotEvidence"]>> {
  const { species, spot, details, spotEvidence } = input;
  const targetSpeciesKnown = spot.targetSpecies.includes(species) || hasConcreteDetail(details, "target_species", (value) => value.valueTextList.includes(species));
  const methodKnown = spot.recommendedMethods.some((method) => getRepresentativeMethods(species).includes(method));
  return {
    directSpecies: Object.hasOwn(spotEvidence ?? {}, "directSpecies") ? spotEvidence?.directSpecies ?? null : targetSpeciesKnown ? { score: 90, confidence: "medium", reason: `${species}を狙える地点情報があります` } : null,
    habitat: Object.hasOwn(spotEvidence ?? {}, "habitat") ? spotEvidence?.habitat ?? null : inferHabitatEvidence(species, spot, details),
    catchHistory: Object.hasOwn(spotEvidence ?? {}, "catchHistory") ? spotEvidence?.catchHistory ?? null : null,
    methodAffinity: Object.hasOwn(spotEvidence ?? {}, "methodAffinity") ? spotEvidence?.methodAffinity ?? null : methodKnown ? { score: 80, confidence: "medium", reason: `${species}向けの代表的な釣法と地点の推奨釣法が合います` } : null,
  };
}

function inferHabitatEvidence(species: FishSpeciesName, spot: FishingSpot, details?: FishingSpotDetailSet | null): ScoreEvidence | null {
  if (!isSupportedSpecies(species)) return null;
  const hasLighting = hasConcreteDetail(details, "lighting", (value) => value.valueBoolean === true || value.valueText === "あり");
  const isPort = ["漁港", "堤防", "湾岸", "河口"].includes(spot.spotType);
  if (species === "アジ" && (isPort || hasLighting)) return { score: hasLighting ? 85 : 70, confidence: hasLighting ? "medium" : "low", reason: "漁港・堤防や常夜灯の条件を生態相性として評価します" };
  if (species === "シーバス" && ["河口", "湾岸", "漁港"].includes(spot.spotType)) return { score: 75, confidence: "low", reason: "河口・港湾系の地形を生態相性として評価します" };
  if (species === "チヌ" && ["河口", "湾岸", "堤防", "漁港"].includes(spot.spotType)) return { score: 75, confidence: "low", reason: "河口・堤防周りの地形を生態相性として評価します" };
  return null;
}

function getRepresentativeMethods(species: FishSpeciesName): FishingMethod[] {
  if (species === "アジ") return ["サビキ", "コマセ"];
  if (species === "シーバス") return ["キャスティング"];
  if (species === "チヌ") return ["コマセ"];
  return [];
}

function getEnvironmentEvidence(species: FishSpeciesName, selectedDateTime: string, row?: EnvironmentForecastRow | null) {
  if (!row) return null;
  const month = Number(selectedDateTime.slice(5, 7));
  const hour = Number(selectedDateTime.slice(11, 13));
  const temp = row.marine?.seaSurfaceTemperatureCelsius ?? null;
  const wave = row.marine?.waveHeightMeters ?? null;
  const wind = row.weather?.windSpeedKmh ?? null;
  const rain = row.weather?.precipitationMm ?? null;
  return {
    waterTemperature: typeof temp === "number" ? { score: temp >= 16 && temp <= 28 ? 80 : 55, confidence: "medium", reason: "海面水温が初期対応魚種の評価範囲にあります" } : null,
    tideCurrent: typeof row.marine?.seaLevelHeightMslMeters === "number" || typeof row.marine?.oceanCurrentVelocityKmh === "number" ? { score: 65, confidence: "low", reason: "潮位または海流データがあるため環境要素として評価します" } : null,
    windWave: typeof wave === "number" || typeof wind === "number" ? { score: (wave ?? 0) <= 1.5 && (wind ?? 0) <= 25 ? 80 : 45, confidence: "medium", reason: "風と波の弱さを安全寄りに評価します" } : null,
    seasonTime: Number.isFinite(month) || Number.isFinite(hour) ? { score: [6, 7, 8, 9, 10, 11].includes(month) || hour <= 8 || hour >= 17 ? 75 : 55, confidence: "low", reason: "季節と時間帯を参考条件として評価します" } : null,
    weatherRain: typeof rain === "number" || typeof row.weather?.weatherCode === "number" ? { score: (rain ?? 0) <= 2 ? 75 : 45, confidence: "low", reason: "雨量と天気を参考条件として評価します" } : null,
  } satisfies Record<keyof typeof SCORE_V2_ENVIRONMENT_WEIGHTS, ScoreEvidence | null>;
}

export function calculateScoreV2ForSpecies(input: ScoreV2SpeciesInput): ScoreV2SpeciesResult {
  if (!isSupportedSpecies(input.species)) return { species: input.species, selectedDateTime: input.selectedDateTime, overallScore: null, spotCompatibilityScore: null, environmentScore: null, confidence: { high: 0, medium: 0, low: 0 }, coveragePercent: 0, partialData: false, informationStatus: "no_information", reasons: [{ label: "魚種情報", points: 0, weight: 0, note: "この魚種はSCORE v2の本番採用値が未調査です" }] };
  const spot = weightedAverage(Object.entries(buildSpotEvidence(input)).map(([key, evidence]) => ({ weight: SCORE_V2_SPOT_WEIGHTS[key as keyof typeof SCORE_V2_SPOT_WEIGHTS], evidence, label: `地点相性:${key}` })));
  const envEvidence = getEnvironmentEvidence(input.species, input.selectedDateTime, input.environmentRow);
  const env = envEvidence ? weightedAverage(Object.entries(envEvidence).map(([key, evidence]) => ({ weight: SCORE_V2_ENVIRONMENT_WEIGHTS[key as keyof typeof SCORE_V2_ENVIRONMENT_WEIGHTS], evidence, label: `環境:${key}` }))) : null;
  const canUseEnvironment = env !== null && env.score !== null && env.coveragePercent >= SCORE_V2_MIN_COVERAGE_PERCENT;
  const canUseSpot = spot.score !== null && spot.coveragePercent >= SCORE_V2_MIN_COVERAGE_PERCENT;
  const overallScore = canUseEnvironment && canUseSpot ? clampScoreV2(spot.score! * 0.7 + env.score! * 0.3) : null;
  const coveragePercent = canUseEnvironment ? Math.round((spot.coveragePercent * 70 + env.coveragePercent * 30) / 100) : spot.coveragePercent;
  return { species: input.species, selectedDateTime: input.selectedDateTime, overallScore, spotCompatibilityScore: spot.score, environmentScore: env?.score ?? null, confidence: spot.confidence, coveragePercent, partialData: coveragePercent < 100, informationStatus: overallScore !== null ? (coveragePercent < 100 ? "partial" : "available") : spot.score !== null ? "reference_only" : "no_information", reasons: [...spot.reasons, ...(env?.reasons ?? [])] };
}

export function calculateScoreV2ForMethod(method: FishingMethod, speciesResults: ScoreV2SpeciesResult[], spotSuitabilityEvidence?: ScoreEvidence | null): ScoreV2MethodResult {
  const contributing = speciesResults.filter((result) => result.overallScore !== null).sort((a, b) => b.overallScore! - a.overallScore!).slice(0, 3);
  const speciesAverageScore = contributing.length > 0 ? clampScoreV2(contributing.reduce((sum, result) => sum + result.overallScore!, 0) / contributing.length) : null;
  const spotSuitabilityScore = spotSuitabilityEvidence ? clampScoreV2(spotSuitabilityEvidence.score * SCORE_V2_CONFIDENCE_COEFFICIENT[spotSuitabilityEvidence.confidence]) : null;
  const overallScore = speciesAverageScore !== null && spotSuitabilityScore !== null ? clampScoreV2(speciesAverageScore * 0.7 + spotSuitabilityScore * 0.3) : null;
  return { method, overallScore, spotSuitabilityScore, speciesAverageScore, contributingSpecies: contributing.map((result) => result.species), contributingSpeciesCount: contributing.length, partialData: contributing.length < 3 || overallScore === null, informationStatus: overallScore !== null ? (contributing.length < 3 ? "partial" : "available") : spotSuitabilityScore !== null ? "reference_only" : "no_information", reasons: [ ...(spotSuitabilityEvidence ? [{ label: "釣り場適性", points: spotSuitabilityScore!, weight: 30, confidence: spotSuitabilityEvidence.confidence, note: spotSuitabilityEvidence.reason }] : []), ...(contributing.length > 0 ? [{ label: "対応魚種平均", points: speciesAverageScore!, weight: 70, note: `${contributing.length}魚種の評価を釣法別点へ反映します` }] : []) ] };
}
