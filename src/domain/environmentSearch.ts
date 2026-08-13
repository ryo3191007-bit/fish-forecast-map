import type { EnvironmentForecastRow, FishingEnvironment } from "./environment";

export type EnvironmentSearchCriteria = {
  forecastTime: string;
  maxWindSpeedKmh: number | null;
  maxWaveHeightMeters: number | null;
};

export type EnvironmentSearchStatus = "match" | "outside" | "insufficient" | "failed";

export type EnvironmentSearchResult = {
  spotId: string;
  spotName: string;
  status: EnvironmentSearchStatus;
  forecastTime: string;
  windSpeedKmh: number | null;
  windDirectionLabel: string | null;
  waveHeightMeters: number | null;
  waveDirectionLabel: string | null;
  reason: string | null;
};

export function shouldApplyEnvironmentSearchResponse(requestId: number, latestRequestId: number) {
  return requestId === latestRequestId;
}

export function invalidateEnvironmentSearchRequest(requestId: number, controller: AbortController | null) {
  controller?.abort();
  return requestId + 1;
}

export function prioritizeEnvironmentSearchMatches(results: readonly EnvironmentSearchResult[]) {
  return [
    ...results.filter((result) => result.status === "match"),
    ...results.filter((result) => result.status !== "match"),
  ];
}

export function evaluateEnvironmentSearch(
  environment: FishingEnvironment,
  criteria: EnvironmentSearchCriteria,
): EnvironmentSearchResult {
  const row = environment.hourly.find((candidate) => candidate.forecastTime === criteria.forecastTime);
  if (!row) return insufficient(environment, criteria.forecastTime, null, "指定時刻の予報データがありません");

  if (environment.cacheStatus === "cache-stale") {
    return insufficient(environment, row.forecastTime, row, "古いキャッシュのため条件一致判定には使用していません");
  }

  const wind = row.weather?.windSpeedKmh ?? null;
  const wave = row.marine?.waveHeightMeters ?? null;
  if (criteria.maxWindSpeedKmh !== null && wind === null) return insufficient(environment, row.forecastTime, row, "風速データがありません");
  if (criteria.maxWaveHeightMeters !== null && wave === null) return insufficient(environment, row.forecastTime, row, "波高データがありません");

  const matchesWind = criteria.maxWindSpeedKmh === null || (wind !== null && wind <= criteria.maxWindSpeedKmh);
  const matchesWave = criteria.maxWaveHeightMeters === null || (wave !== null && wave <= criteria.maxWaveHeightMeters);
  return fromRow(environment, row, matchesWind && matchesWave ? "match" : "outside", null);
}

export function failedEnvironmentSearchResult(spotId: string, spotName: string, forecastTime: string): EnvironmentSearchResult {
  return { spotId, spotName, status: "failed", forecastTime, windSpeedKmh: null, windDirectionLabel: null, waveHeightMeters: null, waveDirectionLabel: null, reason: "予報を取得できませんでした" };
}

function insufficient(environment: FishingEnvironment, forecastTime: string, row: EnvironmentForecastRow | null, reason: string) {
  return row ? fromRow(environment, row, "insufficient", reason) : { spotId: environment.point.spotId, spotName: environment.point.spotName, status: "insufficient" as const, forecastTime, windSpeedKmh: null, windDirectionLabel: null, waveHeightMeters: null, waveDirectionLabel: null, reason };
}

function fromRow(environment: FishingEnvironment, row: EnvironmentForecastRow, status: EnvironmentSearchStatus, reason: string | null): EnvironmentSearchResult {
  return {
    spotId: environment.point.spotId,
    spotName: environment.point.spotName,
    status,
    forecastTime: row.forecastTime,
    windSpeedKmh: row.weather?.windSpeedKmh ?? null,
    windDirectionLabel: row.weather?.windDirectionLabel ?? null,
    waveHeightMeters: row.marine?.waveHeightMeters ?? null,
    waveDirectionLabel: row.marine?.waveDirectionLabel ?? null,
    reason,
  };
}
