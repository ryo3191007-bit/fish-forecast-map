import assert from "node:assert/strict";
import { evaluateEnvironmentSearch, failedEnvironmentSearchResult, invalidateEnvironmentSearchRequest, shouldApplyEnvironmentSearchResponse } from "../src/domain/environmentSearch.ts";
import type { FishingEnvironment } from "../src/domain/environment.ts";

const environment = (wind: number | null, wave: number | null, cacheStatus: FishingEnvironment["cacheStatus"] = "fresh", warning: string | null = null): FishingEnvironment => ({
  point: { spotId: "spot-1", spotName: "テスト地点", latitude: 33, longitude: 130 },
  hourly: [{ forecastTime: "2026-08-13T12:00", weather: { temperatureCelsius: null, weatherCode: null, weatherLabel: "データなし", precipitationMm: null, precipitationProbabilityPercent: null, windSpeedKmh: wind, windDirectionDegrees: 90, windDirectionLabel: "東", windGustKmh: null, observedAt: "2026-08-13T12:00" }, marine: { seaSurfaceTemperatureCelsius: null, seaLevelHeightMslMeters: null, waveHeightMeters: wave, waveDirectionDegrees: 180, waveDirectionLabel: "南", wavePeriodSeconds: null, oceanCurrentVelocityKmh: null, oceanCurrentDirectionDegrees: null, oceanCurrentDirectionLabel: "データなし", observedAt: "2026-08-13T12:00" } }],
  dailySun: [], weatherAvailable: true, marineAvailable: true, fetchedAt: "2026-08-12T00:00:00Z", sourceName: "Open-Meteo", sourceUrl: "https://open-meteo.com/", cacheStatus, fetchStatus: "success", warning,
  tideReference: { spotId: "spot-1", referenceName: null, url: "", note: "" },
});
const criteria = (wind: number | null, wave: number | null) => ({ forecastTime: "2026-08-13T12:00", maxWindSpeedKmh: wind, maxWaveHeightMeters: wave });

assert.equal(evaluateEnvironmentSearch(environment(12, 1.2), criteria(15, null)).status, "match");
assert.equal(evaluateEnvironmentSearch(environment(12, 1.2, "cache-fresh"), criteria(15, 1.5)).status, "match", "fresh cacheは一致判定に利用する");
assert.equal(evaluateEnvironmentSearch(environment(16, 1.2), criteria(15, null)).status, "outside");
assert.equal(evaluateEnvironmentSearch(environment(12, 1.2), criteria(null, 1.5)).status, "match");
assert.equal(evaluateEnvironmentSearch(environment(12, 1.6), criteria(null, 1.5)).status, "outside");
assert.equal(evaluateEnvironmentSearch(environment(12, 1.6), criteria(15, 1.5)).status, "outside", "風速と波高をAND評価する");
assert.equal(evaluateEnvironmentSearch(environment(null, 1), criteria(15, 1.5)).status, "insufficient");
assert.equal(failedEnvironmentSearchResult("x", "取得失敗", criteria(1, 1).forecastTime).status, "failed");
const stale = evaluateEnvironmentSearch(environment(12, 1.2, "cache-stale"), criteria(15, 1.5));
assert.equal(stale.status, "insufficient", "stale cacheは条件内でも一致にしない");
assert.match(stale.reason ?? "", /古いキャッシュ.*使用していません/);
assert.equal(
  evaluateEnvironmentSearch(environment(12, 1.2, "cache-stale", "Open-Meteo APIから最新データを取得できないため、24時間以内のキャッシュを表示しています。"), criteria(15, 1.5)).status,
  "insufficient",
  "最新取得失敗時のstale fallbackも一致にしない",
);
const evidence = evaluateEnvironmentSearch(environment(12, 1.2), criteria(15, 1.5));
assert.deepEqual([evidence.windSpeedKmh, evidence.windDirectionLabel, evidence.waveHeightMeters, evidence.waveDirectionLabel], [12, "東", 1.2, "南"]);
assert.equal(shouldApplyEnvironmentSearchResponse(1, 2), false, "古いレスポンスは適用しない");
assert.equal(shouldApplyEnvironmentSearchResponse(2, 2), true, "最新レスポンスだけ適用する");
const controller = new AbortController();
const invalidatedRequestId = invalidateEnvironmentSearchRequest(2, controller);
assert.equal(invalidatedRequestId, 3, "条件変更時にrequest IDを進める");
assert.equal(controller.signal.aborted, true, "条件変更時に実行中通信をabortする");
assert.equal(shouldApplyEnvironmentSearchResponse(2, invalidatedRequestId), false, "条件変更前のレスポンスは適用しない");
console.log("Issue #399 environment search tests passed.");
