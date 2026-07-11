import { getCompassDirection, getTideReferenceForSpot, getWeatherCodeLabel, type EnvironmentForecastRow, type EnvironmentPoint, type FishingEnvironment, type MarineEnvironment, type WeatherEnvironment } from "@/domain/environment";

const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const MARINE_ENDPOINT = "https://marine-api.open-meteo.com/v1/marine";
const CACHE_VERSION = "environment-forecast-v1";
const FRESH_CACHE_MS = 30 * 60 * 1000;
const FALLBACK_CACHE_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

const weatherHourlyFields = ["temperature_2m", "weather_code", "precipitation", "precipitation_probability", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"];
const marineHourlyFields = ["sea_surface_temperature", "sea_level_height_msl", "wave_height", "wave_direction", "wave_period", "ocean_current_velocity", "ocean_current_direction"];

type HourlyResponse = { hourly?: Record<string, unknown> };
type StorageLike = Pick<Storage, "getItem" | "setItem">;
type CachePayload = { version: typeof CACHE_VERSION; savedAt: string; environment: FishingEnvironment };

export function getEnvironmentCacheKey(point: EnvironmentPoint) {
  return [CACHE_VERSION, point.spotId, point.latitude.toFixed(4), point.longitude.toFixed(4), "7d", weatherHourlyFields.join("."), marineHourlyFields.join(".")].join(":");
}

export function readCachedFishingEnvironment(point: EnvironmentPoint, storage: StorageLike | null = getLocalStorage()): FishingEnvironment | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(getEnvironmentCacheKey(point));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachePayload>;
    if (parsed.version !== CACHE_VERSION || typeof parsed.savedAt !== "string" || !isFishingEnvironmentLike(parsed.environment)) return null;
    const age = Date.now() - Date.parse(parsed.savedAt);
    if (!Number.isFinite(age) || age > FALLBACK_CACHE_MS) return null;
    return { ...parsed.environment, cacheStatus: age <= FRESH_CACHE_MS ? "cache-fresh" : "cache-stale" };
  } catch {
    return null;
  }
}

export function writeCachedFishingEnvironment(environment: FishingEnvironment, storage: StorageLike | null = getLocalStorage()) {
  if (!storage) return;
  try {
    const payload: CachePayload = { version: CACHE_VERSION, savedAt: new Date().toISOString(), environment: { ...environment, cacheStatus: "cache-fresh", warning: null } };
    storage.setItem(getEnvironmentCacheKey(environment.point), JSON.stringify(payload));
  } catch {
    // キャッシュ書込み失敗は予報表示の失敗にしない。
  }
}

export async function fetchFishingEnvironment(point: EnvironmentPoint, signal?: AbortSignal): Promise<FishingEnvironment> {
  const cached = readCachedFishingEnvironment(point);
  try {
    const latest = await fetchLatestFishingEnvironment(point, signal);
    writeCachedFishingEnvironment(latest);
    return latest;
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (cached) return { ...cached, warning: "Open-Meteo APIから最新データを取得できないため、24時間以内のキャッシュを表示しています。" };
    throw error;
  }
}

export async function fetchLatestFishingEnvironment(point: EnvironmentPoint, signal?: AbortSignal): Promise<FishingEnvironment> {
  const [weatherResult, marineResult] = await Promise.allSettled([fetchOpenMeteoWeatherRows(point, signal), fetchOpenMeteoMarineRows(point, signal)]);
  if (signal?.aborted) throw new DOMException("Open-Meteo request was aborted.", "AbortError");

  const weatherRows = weatherResult.status === "fulfilled" ? weatherResult.value : [];
  const marineRows = marineResult.status === "fulfilled" ? marineResult.value : [];
  const hourly = mergeHourlyRows(weatherRows, marineRows);
  const weatherAvailable = weatherRows.length > 0;
  const marineAvailable = marineRows.length > 0;
  if (hourly.length === 0) throw new Error("Open-Meteo weather and marine requests failed.");

  return {
    point,
    hourly,
    weatherAvailable,
    marineAvailable,
    fetchedAt: new Date().toISOString(),
    sourceName: "Open-Meteo Weather Forecast API / Marine Weather API",
    sourceUrl: "https://open-meteo.com/",
    cacheStatus: "fresh",
    fetchStatus: weatherAvailable && marineAvailable ? "success" : "partial",
    warning: weatherAvailable && marineAvailable ? null : "Open-Meteoの一部APIのみ取得できました。取得済みの項目だけ表示します。",
    tideReference: getTideReferenceForSpot(point.spotId),
  };
}

export async function fetchOpenMeteoWeatherRows(point: EnvironmentPoint, signal?: AbortSignal): Promise<EnvironmentForecastRow[]> {
  const data = await fetchJson(buildOpenMeteoUrl(WEATHER_ENDPOINT, point, weatherHourlyFields), signal);
  const times = getTimeArray(data.hourly?.time);
  if (times.length === 0) return [];
  return times.map((time, index) => {
    const weatherCode = getNumberAt(data.hourly?.weather_code, index);
    const windDirectionDegrees = getNumberAt(data.hourly?.wind_direction_10m, index);
    const weather: WeatherEnvironment = {
      temperatureCelsius: getNumberAt(data.hourly?.temperature_2m, index), weatherCode, weatherLabel: getWeatherCodeLabel(weatherCode),
      precipitationMm: getNumberAt(data.hourly?.precipitation, index), precipitationProbabilityPercent: getNumberAt(data.hourly?.precipitation_probability, index),
      windSpeedKmh: getNumberAt(data.hourly?.wind_speed_10m, index), windDirectionDegrees, windDirectionLabel: getCompassDirection(windDirectionDegrees),
      windGustKmh: getNumberAt(data.hourly?.wind_gusts_10m, index), observedAt: time,
    };
    return { forecastTime: time, weather, marine: null };
  });
}

export async function fetchOpenMeteoMarineRows(point: EnvironmentPoint, signal?: AbortSignal): Promise<EnvironmentForecastRow[]> {
  const data = await fetchJson(buildOpenMeteoUrl(MARINE_ENDPOINT, point, marineHourlyFields, { cellSelection: "sea" }), signal);
  const times = getTimeArray(data.hourly?.time);
  if (times.length === 0) return [];
  return times.map((time, index) => {
    const currentDirectionDegrees = getNumberAt(data.hourly?.ocean_current_direction, index);
    const waveDirectionDegrees = getNumberAt(data.hourly?.wave_direction, index);
    const marine: MarineEnvironment = {
      seaSurfaceTemperatureCelsius: getNumberAt(data.hourly?.sea_surface_temperature, index), seaLevelHeightMslMeters: getNumberAt(data.hourly?.sea_level_height_msl, index),
      waveHeightMeters: getNumberAt(data.hourly?.wave_height, index), waveDirectionDegrees, waveDirectionLabel: getCompassDirection(waveDirectionDegrees), wavePeriodSeconds: getNumberAt(data.hourly?.wave_period, index),
      oceanCurrentVelocityKmh: getNumberAt(data.hourly?.ocean_current_velocity, index), oceanCurrentDirectionDegrees: currentDirectionDegrees, oceanCurrentDirectionLabel: getCompassDirection(currentDirectionDegrees), observedAt: time,
    };
    return { forecastTime: time, weather: null, marine };
  });
}

export function mergeHourlyRows(weatherRows: EnvironmentForecastRow[], marineRows: EnvironmentForecastRow[]) {
  const byTime = new Map<string, EnvironmentForecastRow>();
  for (const row of [...weatherRows, ...marineRows]) {
    const current = byTime.get(row.forecastTime) ?? { forecastTime: row.forecastTime, weather: null, marine: null };
    byTime.set(row.forecastTime, { ...current, weather: row.weather ?? current.weather, marine: row.marine ?? current.marine });
  }
  return Array.from(byTime.values()).sort((a, b) => a.forecastTime.localeCompare(b.forecastTime));
}

function buildOpenMeteoUrl(endpoint: string, point: EnvironmentPoint, hourlyFields: string[], options: { cellSelection?: "sea" | "nearest" } = {}) {
  const params = new URLSearchParams({ latitude: point.latitude.toString(), longitude: point.longitude.toString(), hourly: hourlyFields.join(","), timezone: "Asia/Tokyo", forecast_days: "7" });
  if (options.cellSelection) params.set("cell_selection", options.cellSelection);
  return `${endpoint}?${params.toString()}`;
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<HourlyResponse> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(new DOMException("Open-Meteo request timed out.", "TimeoutError")), REQUEST_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;
  try {
    const response = await fetch(url, { signal: combinedSignal });
    if (!response.ok) throw new Error(`Open-Meteo request failed: ${response.status}`);
    return (await response.json()) as HourlyResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getTimeArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function getNumberAt(value: unknown, index: number) { if (!Array.isArray(value)) return null; const item = value[index]; return typeof item === "number" && Number.isFinite(item) ? item : null; }
function getLocalStorage() { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } }
function isAbortError(error: unknown) { return error instanceof DOMException && error.name === "AbortError"; }
function isFishingEnvironmentLike(value: unknown): value is FishingEnvironment {
  if (typeof value !== "object" || value === null) return false;
  const environment = value as Partial<FishingEnvironment>;
  return (
    Array.isArray(environment.hourly) &&
    typeof environment.fetchedAt === "string" &&
    typeof environment.point?.spotId === "string" &&
    typeof environment.point.spotName === "string" &&
    typeof environment.tideReference?.url === "string"
  );
}
