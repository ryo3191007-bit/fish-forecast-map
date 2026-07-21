import { fishSpeciesNames, type FishSpeciesName, type FishingMethod } from "@/domain/fishing";
import type { FishingSpot } from "@/domain/fishingSpot";
import type { FishingSpotDetailSet, SpotDetailConfidence } from "@/domain/fishingSpotDetail";

export type ScoreV2InformationStatus = "available" | "partial" | "reference_only" | "no_information";
export type ScoreV2Confidence = Exclude<SpotDetailConfidence, null>;
export type ScoreV2DisplayReason = { label: string; points: number; weight: number; confidence?: ScoreV2Confidence; displayNote: string };
export type ScoreV2SourceNote = { internalNote?: string; sourceUrl?: string };
export type ScoreV2Reason = ScoreV2DisplayReason;

export type ScoreV2Coverage = {
  spotCompatibilityPercent: number;
  environmentPercent: number;
  overallPercent: number;
};

export type ScoreV2SpeciesResult = {
  species: FishSpeciesName;
  selectedDateTime: string;
  overallScore: number | null;
  spotCompatibilityScore: number | null;
  environmentScore: number | null;
  confidence: { spot: ScoreV2ConfidenceCounts; environment: ScoreV2ConfidenceCounts };
  coverage: ScoreV2Coverage;
  coveragePercent: number;
  partialData: boolean;
  informationStatus: ScoreV2InformationStatus;
  reasons: ScoreV2Reason[];
};

export type ScoreV2ConfidenceCounts = Record<ScoreV2Confidence, number>;
export type ScoreEvidence = ScoreV2SourceNote & { score: number; confidence: ScoreV2Confidence; displayReason?: string };
export type ScoreV2SpotEvidenceKey = "directSpecies" | "habitat" | "catchHistory" | "methodAffinity";
export type ScoreV2EnvironmentEvidenceKey = keyof typeof SCORE_V2_ENVIRONMENT_WEIGHTS;

export type ScoreV2MethodCompatibility = Partial<Record<FishingMethod, readonly FishSpeciesName[]>>;
export type ScoreV2SpotSuitabilityInput = ScoreEvidence;

export type ScoreV2MethodResult = {
  method: FishingMethod;
  overallScore: number | null;
  spotSuitabilityScore: number | null;
  speciesAverageScore: number | null;
  contributingSpecies: FishSpeciesName[];
  contributingSpeciesCount: number;
  coverage: { spotSuitabilityPercent: number; speciesPercent: number; overallPercent: number };
  partialData: boolean;
  informationStatus: ScoreV2InformationStatus;
  reasons: ScoreV2Reason[];
};

export type ScoreV2SpeciesInput = {
  species: FishSpeciesName;
  spot: FishingSpot;
  details?: FishingSpotDetailSet | null;
  selectedDateTime: string;
  spotEvidence?: Partial<Record<ScoreV2SpotEvidenceKey, ScoreEvidence | null>>;
  environmentEvidence?: Partial<Record<ScoreV2EnvironmentEvidenceKey, ScoreEvidence | null>>;
};

export const SCORE_V2_SUPPORTED_SPECIES = ["マアジ", "スズキ", "チヌ"] as const satisfies readonly FishSpeciesName[];
export const SCORE_V2_UNRESEARCHED_SPECIES = fishSpeciesNames.filter(
  (species) => !SCORE_V2_SUPPORTED_SPECIES.includes(species as (typeof SCORE_V2_SUPPORTED_SPECIES)[number]),
);

export const SCORE_V2_CONFIDENCE_COEFFICIENT: Record<ScoreV2Confidence, number> = { high: 1, medium: 0.6, low: 0.3 };
export const SCORE_V2_TOTAL_WEIGHTS = { spotCompatibility: 70, environment: 30 } as const;
export const SCORE_V2_SPOT_WEIGHTS = { directSpecies: 40, habitat: 30, catchHistory: 20, methodAffinity: 10 } as const;
export const SCORE_V2_ENVIRONMENT_WEIGHTS = { waterTemperature: 30, tideCurrent: 25, windWave: 20, seasonTime: 15, weatherRain: 10 } as const;
export const SCORE_V2_METHOD_WEIGHTS = { speciesAverage: 70, spotSuitability: 30 } as const;
export const SCORE_V2_MIN_COVERAGE_PERCENT = 60;

const clampScoreV2 = (score: number) => Math.max(0, Math.min(100, Math.round(score)));
const weightRatio = (weight: number, total: number) => weight / total;
const totalWeight = (weights: Record<string, number>) => Object.values(weights).reduce((sum, weight) => sum + weight, 0);
const SCORE_V2_TOTAL_WEIGHT_SUM = totalWeight(SCORE_V2_TOTAL_WEIGHTS);
const SCORE_V2_METHOD_WEIGHT_SUM = totalWeight(SCORE_V2_METHOD_WEIGHTS);

const SCORE_V2_SPOT_REASON_LABELS: Record<ScoreV2SpotEvidenceKey, string> = {
  directSpecies: "対象魚の実績",
  habitat: "生息環境",
  catchHistory: "釣果履歴",
  methodAffinity: "釣法との相性",
};

const SCORE_V2_ENVIRONMENT_REASON_LABELS: Record<ScoreV2EnvironmentEvidenceKey, string> = {
  waterTemperature: "水温",
  tideCurrent: "潮・流れ",
  windWave: "風・波",
  seasonTime: "季節・時間帯",
  weatherRain: "天気・雨",
};

function displayNoteFor(label: string, evidence: ScoreEvidence) {
  return evidence.displayReason ?? `${label}の承認済み評価を反映しています`;
}
const isSupportedSpecies = (species: FishSpeciesName) => SCORE_V2_SUPPORTED_SPECIES.includes(species as (typeof SCORE_V2_SUPPORTED_SPECIES)[number]);

function weightedAverage(items: { weight: number; evidence: ScoreEvidence | null | undefined; label: string }[]) {
  const available = items.filter((item): item is { weight: number; evidence: ScoreEvidence; label: string } => Boolean(item.evidence));
  const availableWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const coveragePercent = totalWeight > 0 ? Math.round((availableWeight / totalWeight) * 100) : 0;
  if (availableWeight === 0) return { score: null, coveragePercent, partialData: true, reasons: [] as ScoreV2Reason[], confidence: { high: 0, medium: 0, low: 0 } satisfies ScoreV2ConfidenceCounts };

  const confidence: ScoreV2ConfidenceCounts = { high: 0, medium: 0, low: 0 };
  const reasons = available.map(({ weight, evidence, label }) => {
    confidence[evidence.confidence] += 1;
    return { label, points: clampScoreV2(evidence.score), weight, confidence: evidence.confidence, displayNote: displayNoteFor(label, evidence) };
  });
  const raw = available.reduce((sum, { weight, evidence }) => sum + clampScoreV2(evidence.score) * weight * SCORE_V2_CONFIDENCE_COEFFICIENT[evidence.confidence], 0) / availableWeight;
  return { score: clampScoreV2(raw), coveragePercent, partialData: coveragePercent < 100, reasons, confidence };
}

function buildApprovedSpotEvidence(input: ScoreV2SpeciesInput): Required<NonNullable<ScoreV2SpeciesInput["spotEvidence"]>> {
  return {
    directSpecies: input.spotEvidence?.directSpecies ?? null,
    habitat: input.spotEvidence?.habitat ?? null,
    catchHistory: input.spotEvidence?.catchHistory ?? null,
    methodAffinity: input.spotEvidence?.methodAffinity ?? null,
  };
}

function buildApprovedEnvironmentEvidence(input: ScoreV2SpeciesInput) {
  return {
    waterTemperature: input.environmentEvidence?.waterTemperature ?? null,
    tideCurrent: input.environmentEvidence?.tideCurrent ?? null,
    windWave: input.environmentEvidence?.windWave ?? null,
    seasonTime: input.environmentEvidence?.seasonTime ?? null,
    weatherRain: input.environmentEvidence?.weatherRain ?? null,
  } satisfies Record<ScoreV2EnvironmentEvidenceKey, ScoreEvidence | null>;
}

export function calculateScoreV2ForSpecies(input: ScoreV2SpeciesInput): ScoreV2SpeciesResult {
  if (!isSupportedSpecies(input.species)) return { species: input.species, selectedDateTime: input.selectedDateTime, overallScore: null, spotCompatibilityScore: null, environmentScore: null, confidence: { spot: { high: 0, medium: 0, low: 0 }, environment: { high: 0, medium: 0, low: 0 } }, coverage: { spotCompatibilityPercent: 0, environmentPercent: 0, overallPercent: 0 }, coveragePercent: 0, partialData: false, informationStatus: "no_information", reasons: [{ label: "魚種情報", points: 0, weight: 0, displayNote: "この魚種はSCORE v2の本番採用値が未調査です" }] };
  const spot = weightedAverage(Object.entries(buildApprovedSpotEvidence(input)).map(([key, evidence]) => ({ weight: SCORE_V2_SPOT_WEIGHTS[key as ScoreV2SpotEvidenceKey], evidence, label: SCORE_V2_SPOT_REASON_LABELS[key as ScoreV2SpotEvidenceKey] })));
  const envEvidence = buildApprovedEnvironmentEvidence(input);
  const env = envEvidence ? weightedAverage(Object.entries(envEvidence).map(([key, evidence]) => ({ weight: SCORE_V2_ENVIRONMENT_WEIGHTS[key as ScoreV2EnvironmentEvidenceKey], evidence, label: SCORE_V2_ENVIRONMENT_REASON_LABELS[key as ScoreV2EnvironmentEvidenceKey] }))) : null;
  const canUseEnvironment = env !== null && env.score !== null && env.coveragePercent >= SCORE_V2_MIN_COVERAGE_PERCENT;
  const canUseSpot = spot.score !== null && spot.coveragePercent >= SCORE_V2_MIN_COVERAGE_PERCENT;
  const overallScore = canUseEnvironment && canUseSpot ? clampScoreV2(spot.score! * weightRatio(SCORE_V2_TOTAL_WEIGHTS.spotCompatibility, SCORE_V2_TOTAL_WEIGHT_SUM) + env.score! * weightRatio(SCORE_V2_TOTAL_WEIGHTS.environment, SCORE_V2_TOTAL_WEIGHT_SUM)) : null;
  const overallPercent = canUseEnvironment ? Math.round((spot.coveragePercent * SCORE_V2_TOTAL_WEIGHTS.spotCompatibility + env.coveragePercent * SCORE_V2_TOTAL_WEIGHTS.environment) / SCORE_V2_TOTAL_WEIGHT_SUM) : 0;
  const coverage = { spotCompatibilityPercent: spot.coveragePercent, environmentPercent: env?.coveragePercent ?? 0, overallPercent };
  return { species: input.species, selectedDateTime: input.selectedDateTime, overallScore, spotCompatibilityScore: spot.score, environmentScore: env?.score ?? null, confidence: { spot: spot.confidence, environment: env?.confidence ?? { high: 0, medium: 0, low: 0 } }, coverage, coveragePercent: overallPercent, partialData: overallScore === null || overallPercent < 100, informationStatus: overallScore !== null ? (overallPercent < 100 ? "partial" : "available") : spot.score !== null ? "reference_only" : "no_information", reasons: [...spot.reasons, ...(env?.reasons ?? [])] };
}

export function calculateScoreV2ForMethod(method: FishingMethod, speciesResults: ScoreV2SpeciesResult[], methodCompatibility: ScoreV2MethodCompatibility, spotSuitability?: ScoreV2SpotSuitabilityInput | null): ScoreV2MethodResult {
  const compatibleSpecies = new Set(methodCompatibility[method] ?? []);
  if (compatibleSpecies.size === 0) return { method, overallScore: null, spotSuitabilityScore: null, speciesAverageScore: null, contributingSpecies: [], contributingSpeciesCount: 0, coverage: { spotSuitabilityPercent: 0, speciesPercent: 0, overallPercent: 0 }, partialData: false, informationStatus: "no_information", reasons: [{ label: "釣法対応魚種", points: 0, weight: 0, displayNote: "この釣法に対応する承認済み魚種入力がありません" }] };
  const contributing = speciesResults.filter((result) => compatibleSpecies.has(result.species) && result.overallScore !== null).sort((a, b) => b.overallScore! - a.overallScore!).slice(0, 3);
  const speciesAverageScore = contributing.length > 0 ? clampScoreV2(contributing.reduce((sum, result) => sum + result.overallScore!, 0) / contributing.length) : null;
  const speciesPercent = Math.round((contributing.length / Math.min(3, compatibleSpecies.size)) * 100);
  const spotSuitabilityScore = spotSuitability ? clampScoreV2(spotSuitability.score * SCORE_V2_CONFIDENCE_COEFFICIENT[spotSuitability.confidence]) : null;
  const spotSuitabilityPercent = spotSuitability ? 100 : 0;
  const overallScore = speciesAverageScore !== null && spotSuitabilityScore !== null ? clampScoreV2(speciesAverageScore * weightRatio(SCORE_V2_METHOD_WEIGHTS.speciesAverage, SCORE_V2_METHOD_WEIGHT_SUM) + spotSuitabilityScore * weightRatio(SCORE_V2_METHOD_WEIGHTS.spotSuitability, SCORE_V2_METHOD_WEIGHT_SUM)) : null;
  const overallPercent = overallScore !== null ? Math.round((speciesPercent * SCORE_V2_METHOD_WEIGHTS.speciesAverage + spotSuitabilityPercent * SCORE_V2_METHOD_WEIGHTS.spotSuitability) / SCORE_V2_METHOD_WEIGHT_SUM) : 0;
  return { method, overallScore, spotSuitabilityScore, speciesAverageScore, contributingSpecies: contributing.map((result) => result.species), contributingSpeciesCount: contributing.length, coverage: { spotSuitabilityPercent, speciesPercent, overallPercent }, partialData: overallScore === null || overallPercent < 100, informationStatus: overallScore !== null ? (overallPercent < 100 ? "partial" : "available") : spotSuitabilityScore !== null ? "reference_only" : "no_information", reasons: [ ...(spotSuitability ? [{ label: "釣り場適性", points: spotSuitabilityScore!, weight: SCORE_V2_METHOD_WEIGHTS.spotSuitability, confidence: spotSuitability.confidence, displayNote: displayNoteFor("釣り場適性", spotSuitability) }] : []), ...(contributing.length > 0 ? [{ label: "対応魚種平均", points: speciesAverageScore!, weight: SCORE_V2_METHOD_WEIGHTS.speciesAverage, displayNote: `${contributing.length}魚種の評価を釣法別点へ反映します` }] : []) ] };
}
