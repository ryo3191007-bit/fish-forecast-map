import { getNearestForecastTime, type EnvironmentForecastRow, type FishingEnvironment } from "@/domain/environment";
import type { FishingSpotDetailSet, SpotDetailValue } from "@/domain/fishingSpotDetail";
import type { ScoreV2SpeciesResult } from "@/domain/scoreV2";

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

export function formatSpotDetailValue(item: SpotDetailValue | undefined) {
  if (!item || !["has_evidence", "weak_evidence"].includes(item.informationState)) return "情報なし";
  const label = (value: string) => detailLabels[value] ?? (/^[a-z0-9_.:-]+$/i.test(value) ? "その他の確認済み情報" : value);
  if (item.valueTextList.length) return item.valueTextList.map(label).join("、");
  if (item.valueText) return label(item.valueText);
  if (item.valueNumber !== null) return `${item.valueNumber}${item.unit ?? ""}`;
  if (item.valueBoolean !== null) return item.valueBoolean ? "あり" : "なし";
  return "情報なし";
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
