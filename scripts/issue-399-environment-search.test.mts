import assert from "node:assert/strict";
import { evaluateEnvironmentSearch, failedEnvironmentSearchResult, shouldApplyEnvironmentSearchResponse } from "../src/domain/environmentSearch.ts";
import type { FishingEnvironment } from "../src/domain/environment.ts";

const environment = (wind: number | null, wave: number | null): FishingEnvironment => ({
  point: { spotId: "spot-1", spotName: "テスト地点", latitude: 33, longitude: 130 },
  hourly: [{ forecastTime: "2026-08-13T12:00", weather: { temperatureCelsius: null, weatherCode: null, weatherLabel: "データなし", precipitationMm: null, precipitationProbabilityPercent: null, windSpeedKmh: wind, windDirectionDegrees: 90, windDirectionLabel: "東", windGustKmh: null, observedAt: "2026-08-13T12:00" }, marine: { seaSurfaceTemperatureCelsius: null, seaLevelHeightMslMeters: null, waveHeightMeters: wave, waveDirectionDegrees: 180, waveDirectionLabel: "南", wavePeriodSeconds: null, oceanCurrentVelocityKmh: null, oceanCurrentDirectionDegrees: null, oceanCurrentDirectionLabel: "データなし", observedAt: "2026-08-13T12:00" } }],
  dailySun: [], weatherAvailable: true, marineAvailable: true, fetchedAt: "2026-08-12T00:00:00Z", sourceName: "Open-Meteo", sourceUrl: "https://open-meteo.com/", cacheStatus: "fresh", fetchStatus: "success", warning: null,
  tideReference: { spotId: "spot-1", referenceName: null, url: "", note: "" },
});
const criteria = (wind: number | null, wave: number | null) => ({ forecastTime: "2026-08-13T12:00", maxWindSpeedKmh: wind, maxWaveHeightMeters: wave });

assert.equal(evaluateEnvironmentSearch(environment(12, 1.2), criteria(15, null)).status, "match");
assert.equal(evaluateEnvironmentSearch(environment(16, 1.2), criteria(15, null)).status, "outside");
assert.equal(evaluateEnvironmentSearch(environment(12, 1.2), criteria(null, 1.5)).status, "match");
assert.equal(evaluateEnvironmentSearch(environment(12, 1.6), criteria(null, 1.5)).status, "outside");
assert.equal(evaluateEnvironmentSearch(environment(12, 1.6), criteria(15, 1.5)).status, "outside", "風速と波高をAND評価する");
assert.equal(evaluateEnvironmentSearch(environment(null, 1), criteria(15, 1.5)).status, "insufficient");
assert.equal(failedEnvironmentSearchResult("x", "取得失敗", criteria(1, 1).forecastTime).status, "failed");
const evidence = evaluateEnvironmentSearch(environment(12, 1.2), criteria(15, 1.5));
assert.deepEqual([evidence.windSpeedKmh, evidence.windDirectionLabel, evidence.waveHeightMeters, evidence.waveDirectionLabel], [12, "東", 1.2, "南"]);
assert.equal(shouldApplyEnvironmentSearchResponse(1, 2), false, "古いレスポンスは適用しない");
assert.equal(shouldApplyEnvironmentSearchResponse(2, 2), true, "最新レスポンスだけ適用する");
console.log("Issue #399 environment search tests passed.");
