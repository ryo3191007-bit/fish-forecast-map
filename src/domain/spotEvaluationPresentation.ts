import { getNearestForecastTime, type EnvironmentForecastRow, type FishingEnvironment } from "@/domain/environment";
import type { FishingSpotDetailSet, SpotDetailValue } from "@/domain/fishingSpotDetail";
import type { ScoreV2SpeciesResult } from "@/domain/scoreV2";
import type { ScoreV2ProductionResult } from "@/domain/scoreV2Production";

export type AllSpeciesHistoryState = {
  view: "all-species";
  spotId: string;
  selectedTime: string | null;
};

export function sortAllSpeciesResults(results: readonly ScoreV2SpeciesResult[]) {
  const group = (item: ScoreV2SpeciesResult) => item.informationStatus === "no_information" ? 2 : item.overallScore === null ? 1 : 0;
  return [...results].sort((a, b) => {
    const groupDifference = group(a) - group(b);
    if (groupDifference) return groupDifference;
    if (group(a) === 0) return (b.overallScore ?? -1) - (a.overallScore ?? -1);
    if (group(a) === 1) return (b.spotCompatibilityScore ?? -1) - (a.spotCompatibilityScore ?? -1);
    return 0;
  });
}

export function filterSpeciesResults(results: readonly ScoreV2SpeciesResult[], query: string) {
  const normalized = query.trim().toLocaleLowerCase("ja");
  return normalized ? results.filter((item) => item.species.toLocaleLowerCase("ja").includes(normalized)) : [...results];
}

export function isValidAllSpeciesHistoryState(
  value: unknown,
  spotIds: readonly string[],
  forecastTimes: readonly string[],
): value is AllSpeciesHistoryState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<AllSpeciesHistoryState>;
  return state.view === "all-species" && typeof state.spotId === "string" && spotIds.includes(state.spotId)
    && (state.selectedTime === null || (typeof state.selectedTime === "string" && forecastTimes.includes(state.selectedTime)));
}

export type AllSpeciesReturnState = {
  dashboardMode: "spotEvaluation";
  spotEvaluationTab: "評価";
  showAllSpecies: false;
  spotId: string;
  selectedTime: string | null;
  query: "";
};

export type InitialAllSpeciesHashResolution =
  | { kind: "switch-spot"; spotId: string }
  | { kind: "waiting" }
  | { kind: "restore"; state: AllSpeciesHistoryState }
  | { kind: "fallback"; state: AllSpeciesReturnState; removeHash: true };

export function resolveAllSpeciesReturnState(
  historyState: unknown,
  spotIds: readonly string[],
  forecastTimesBySpot: Readonly<Record<string, readonly string[]>>,
  fallbackSpotId: string,
  fallbackSelectedTime: string | null,
): AllSpeciesReturnState {
  const candidate = historyState && typeof historyState === "object" && "spotId" in historyState
    ? historyState as { spotId?: unknown }
    : null;
  const candidateTimes = typeof candidate?.spotId === "string" ? forecastTimesBySpot[candidate.spotId] ?? [] : [];
  const validHistory = isValidAllSpeciesHistoryState(historyState, spotIds, candidateTimes);
  const safeFallbackSpotId = spotIds.includes(fallbackSpotId) ? fallbackSpotId : spotIds[0] ?? "";
  const fallbackTimes = forecastTimesBySpot[safeFallbackSpotId] ?? [];
  return {
    dashboardMode: "spotEvaluation",
    spotEvaluationTab: "評価",
    showAllSpecies: false,
    spotId: validHistory ? historyState.spotId : safeFallbackSpotId,
    selectedTime: validHistory
      ? historyState.selectedTime
      : fallbackSelectedTime && fallbackTimes.includes(fallbackSelectedTime) ? fallbackSelectedTime : fallbackTimes[0] ?? null,
    query: "",
  };
}

export function resolveInitialAllSpeciesHash(
  historyState: unknown,
  spotIds: readonly string[],
  currentSpotId: string,
  environmentRequestSpotId: string | null,
  environmentSpotId: string | null,
  forecastTimes: readonly string[],
  isEnvironmentLoading: boolean,
  environmentError: string | null,
): InitialAllSpeciesHashResolution {
  const candidate = historyState && typeof historyState === "object" ? historyState as Partial<AllSpeciesHistoryState> : null;
  const validSpotId = typeof candidate?.spotId === "string" && spotIds.includes(candidate.spotId)
    ? candidate.spotId
    : null;

  if (validSpotId && validSpotId !== currentSpotId) {
    return { kind: "switch-spot", spotId: validSpotId };
  }

  const matchingForecastTimes = validSpotId && environmentSpotId === validSpotId ? forecastTimes : [];
  if (isValidAllSpeciesHistoryState(historyState, spotIds, matchingForecastTimes)) {
    return { kind: "restore", state: historyState };
  }

  const needsForecastRow = validSpotId && candidate?.selectedTime !== null;
  const targetRequestPending = validSpotId && environmentRequestSpotId !== validSpotId;
  if (needsForecastRow && !environmentError && (targetRequestPending || isEnvironmentLoading)) {
    return { kind: "waiting" };
  }

  const fallback = resolveAllSpeciesReturnState(
    null,
    spotIds,
    environmentSpotId && spotIds.includes(environmentSpotId) ? { [environmentSpotId]: forecastTimes } : {},
    currentSpotId,
    null,
  );
  return { kind: "fallback", state: fallback, removeHash: true };
}

export function getAllSpeciesStatusMessage(result: Pick<ScoreV2ProductionResult, "status" | "safetyStatus"> & { displayMessage?: string }) {
  if (result.status === "available") return null;
  if (result.status === "unsafe" || result.safetyStatus === "unsafe") {
    return "危険な可能性があるため、総合点を表示していません。地点相性のみ参考点として表示します。";
  }
  return "安全情報を確認できないため、総合評価は未算出です。地点相性のみ参考点として表示します。";
}

export type SpotDetailLoadStatus = "idle" | "loading" | "ready" | "failed";

export function resolveSelectedForecastTime(
  rows: EnvironmentForecastRow[],
  selectedTime: string | null,
  now = new Date(),
) {
  if (selectedTime && rows.some((row) => row.forecastTime === selectedTime)) {
    return selectedTime;
  }
  return getNearestForecastTime(rows, now);
}

export function getEvaluationReferenceTime(selectedTime: string | null, now = new Date()) {
  if (selectedTime) return selectedTime;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:00`;
}

const detailLabels: Record<string, string> = {
  open_sea: "外海", fishing_port: "漁港", breakwater: "堤防", inner_bay: "内湾",
  rocky: "岩礁", sand: "砂地", sand_mud: "砂泥", rocky_shore: "磯", beach: "サーフ",
  quay: "岸壁", estuary: "河口", structure: "構造物", seaweed_bed: "藻場",
  tidal_flat: "干潟", shell_bottom: "貝殻底", artificial_reef: "人工魚礁",
  "river_influence:none": "河川の影響なし", "river_influence:present": "河川の影響あり",
  "open_sea_exposure:open_sea": "外海の影響あり", "open_sea_exposure:sheltered": "外海の影響が小さい",
  "tidal_flow:good": "潮通しが良い", stable: "安定した足場", port: "港", harbor: "港",
};

const detailEnumLabels: Record<string, Record<string, string>> = {
  river_influence: { none: "河川の影響なし", weak: "河川の影響が弱い" },
  open_sea_bay_character: { open_sea: "外海", bay_mouth: "湾口", bay: "湾内", inner_bay: "内湾" },
};

const compactFacilityLabels: Record<"toilet" | "parking", { label: string; affirmativeValues: readonly string[] }> = {
  toilet: { label: "トイレ", affirmativeValues: ["トイレ候補（現行未確認）", "トイレ候補", "トイレあり"] },
  parking: { label: "駐車", affirmativeValues: ["駐車場候補（現行未確認）", "駐車場候補", "駐車場あり"] },
};

const negativeFacilityValues: Readonly<Record<string, string>> = {
  none: "なし",
  no: "なし",
  absent: "なし",
  unavailable: "利用不可",
  not_available: "利用不可",
};

const NATURAL_TERRAIN_LABELS = [
  [/(砂泥)/, "砂泥底"], [/(砂地)/, "砂地"], [/(岩礁|岩場)/, "岩礁"], [/(藻場)/, "藻場"],
  [/(かけ上がり)/, "かけ上がり"], [/(浅場)/, "浅場"], [/(深場)/, "深場"], [/(河口)/, "河口"],
  [/(湾奥)/, "湾奥"],
] as const;

const FISHING_STRUCTURE_LABELS = [
  [/(島の漁港)/, "島の漁港"], [/(堤防|波止)/, "堤防"], [/(岸壁)/, "岸壁"], [/(護岸)/, "護岸"], [/(テトラ)/, "テトラ"],
  [/(磯)/, "磯"], [/(砂浜|海水浴場|サーフ|beach)/i, "砂浜"],
] as const;

function classifiedLabels(values: readonly string[], rules: readonly (readonly [RegExp, string])[]) {
  return [...new Set(rules.filter(([pattern]) => values.some((value) => pattern.test(value))).map(([, label]) => label))];
}

/** Reduce one curated item to the short taxonomy labels used by the ordinary UI. */
export function formatTerrainDetailForPresentation(details: FishingSpotDetailSet | null, itemKey: "coastal_topography" | "spot_features") {
  if (!details) return null;
  const candidates = details.values.filter((value) =>
    value.itemKey === itemKey
    && value.informationState !== "rejected"
    && value.adoptionStatus === "adopted"
  );
  const evidence = candidates.filter((value) => value.informationState === "has_evidence" || value.informationState === "weak_evidence");
  const rawValues = evidence.flatMap((value) => value.valueTextList.length ? value.valueTextList : value.valueText ? [value.valueText] : []);
  const labels = classifiedLabels(rawValues, itemKey === "coastal_topography" ? NATURAL_TERRAIN_LABELS : FISHING_STRUCTURE_LABELS);
  if (!labels.length) return null;
  const contributing = evidence.filter((value) => {
    const values = value.valueTextList.length ? value.valueTextList : value.valueText ? [value.valueText] : [];
    return classifiedLabels(values, itemKey === "coastal_topography" ? NATURAL_TERRAIN_LABELS : FISHING_STRUCTURE_LABELS).length > 0;
  });
  const confidenceRank: Record<NonNullable<SpotDetailValue["confidence"]>, number> = { low: 0, medium: 1, high: 2 };
  const confidence = contributing.map((value) => value.confidence).filter((value): value is NonNullable<SpotDetailValue["confidence"]> => value !== null)
    .sort((a, b) => confidenceRank[a] - confidenceRank[b])[0] ?? null;
  return { text: labels.join("、"), confidence };
}

export function formatSpotDetailValue(item: SpotDetailValue | undefined) {
  if (!item) return "未調査";
  if (item.informationState === "researched_unknown") return "調査済み・未確定";
  if (item.informationState === "unresearched") return "未調査";
  if (item.informationState === "rejected") return "調査済み・不採用";
  const facility = item.itemKey === "toilet" || item.itemKey === "parking" ? compactFacilityLabels[item.itemKey] : null;
  if (facility && item.valueBoolean !== null) return item.valueBoolean ? facility.label : "なし";
  if (facility && item.valueText && facility.affirmativeValues.includes(item.valueText)) return facility.label;
  if (facility && item.valueText && negativeFacilityValues[item.valueText]) return negativeFacilityValues[item.valueText];
  const label = (value: string) => detailEnumLabels[item.itemKey]?.[value] ?? detailLabels[value] ?? (/^[a-z0-9_.:-]+$/i.test(value) ? "その他の確認済み情報" : value);
  if (item.valueTextList.length) return item.valueTextList.map(label).join("、");
  if (item.valueText) return label(item.valueText);
  if (item.valueNumber !== null) return `${item.valueNumber}${item.unit ?? ""}`;
  if (item.valueBoolean !== null) return item.valueBoolean ? "あり" : "なし";
  return "調査済み・未確定";
}

export function findDisplayableSpotDetail(details: FishingSpotDetailSet | null, itemKey: string) {
  return details?.values.find((value) =>
    value.itemKey === itemKey
    && value.informationState !== "rejected"
    && value.adoptionStatus === "adopted"
  );
}

export function scopeSpotDetails(details: FishingSpotDetailSet | null, selectedSpotId: string) {
  if (!details) return null;
  const values = details.values.filter((value) => value.spotId === selectedSpotId);
  return values.length ? { ...details, values } : null;
}

export function getEnvironmentStatusLabel(environment: FishingEnvironment | null, error: string | null) {
  if (error && !environment) return "取得失敗";
  if (!environment) return "情報なし";
  if (environment.cacheStatus === "cache-stale") return environment.warning ? `古いキャッシュ（${environment.warning}）` : "古いキャッシュ（安全情報不明）";
  if (environment.fetchStatus === "failed") return environment.cacheStatus === "cache-fresh" ? "キャッシュ（API更新失敗）" : "取得失敗";
  if (environment.fetchStatus === "partial") return environment.warning ? `一部データのみ（${environment.warning}）` : "一部データのみ";
  if (environment.cacheStatus === "cache-fresh") return environment.warning ? `キャッシュ（${environment.warning}）` : "キャッシュ";
  return environment.warning ? `最新データ（${environment.warning}）` : "最新データ";
}
