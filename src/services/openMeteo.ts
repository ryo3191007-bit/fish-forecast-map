import {
  getCompassDirection,
  getTideReferenceForSpot,
  getWeatherCodeLabel,
  parseForecastTime,
  type EnvironmentForecastRow,
  type EnvironmentPoint,
  type FishingEnvironment,
  type MarineEnvironment,
  type WeatherEnvironment,
} from "@/domain/environment";

const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const MARINE_ENDPOINT = "https://marine-api.open-meteo.com/v1/marine";
const CACHE_VERSION = "environment-forecast-v3";
const FRESH_CACHE_MS = 30 * 60 * 1000;
const FALLBACK_CACHE_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

const weatherHourlyFields = [
  "temperature_2m",
  "weather_code",
  "precipitation",
  "precipitation_probability",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
];

const marineHourlyFields = [
  "sea_surface_temperature",
  "sea_level_height_msl",
  "wave_height",
  "wave_direction",
  "wave_period",
  "ocean_current_velocity",
  "ocean_current_direction",
];

const weatherNumberKeys = ["temperatureCelsius", "weatherCode", "precipitationMm", "precipitationProbabilityPercent", "windSpeedKmh", "windDirectionDegrees", "windGustKmh"] as const;
const marineNumberKeys = ["seaSurfaceTemperatureCelsius", "seaLevelHeightMslMeters", "waveHeightMeters", "waveDirectionDegrees", "wavePeriodSeconds", "oceanCurrentVelocityKmh", "oceanCurrentDirectionDegrees"] as const;

type HourlyResponse = { hourly?: Record<string, unknown>; daily?: Record<string, unknown> };
type FetchResponse = { ok: boolean; status: number; json: () => Promise<HourlyResponse> };
type FetchImpl = (input: string, init?: { signal?: AbortSignal }) => Promise<FetchResponse>;
type StorageLike = Pick<Storage, "getItem" | "setItem">;
type CachePayload = { version: typeof CACHE_VERSION; savedAt: string; environment: FishingEnvironment };
type FetchOptions = { signal?: AbortSignal; fetchImpl?: FetchImpl; storage?: StorageLike | null; now?: () => Date; timeoutMs?: number };
type NormalizedTime = { forecastTime: string; originalIndex: number };

type RequestGuard = { isActive: () => boolean };

export function shouldApplyEnvironmentRequest(guard: RequestGuard) {
  return guard.isActive();
}

export function getEnvironmentCacheKey(point: EnvironmentPoint) {
  return [
    CACHE_VERSION,
    point.spotId,
    point.latitude.toFixed(4),
    point.longitude.toFixed(4),
    "7d",
    weatherHourlyFields.join("."),
    marineHourlyFields.join("."),
  ].join(":");
}

export function readCachedFishingEnvironment(point: EnvironmentPoint, storage: StorageLike | null = getLocalStorage(), now: () => Date = () => new Date()): FishingEnvironment | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(getEnvironmentCacheKey(point));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CachePayload>;
    if (parsed.version !== CACHE_VERSION || typeof parsed.savedAt !== "string" || !isValidDate(parsed.savedAt) || !isFishingEnvironmentLike(parsed.environment)) {
      return null;
    }

    const age = now().getTime() - parseForecastTime(parsed.savedAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age > FALLBACK_CACHE_MS) return null;

    return {
      ...parsed.environment,
      cacheStatus: age <= FRESH_CACHE_MS ? "cache-fresh" : "cache-stale",
    };
  } catch {
    return null;
  }
}

export function writeCachedFishingEnvironment(environment: FishingEnvironment, storage: StorageLike | null = getLocalStorage(), now: () => Date = () => new Date()) {
  if (!storage) return;

  try {
    const payload: CachePayload = {
      version: CACHE_VERSION,
      savedAt: now().toISOString(),
      environment: { ...environment, cacheStatus: "cache-fresh", warning: null },
    };
    storage.setItem(getEnvironmentCacheKey(environment.point), JSON.stringify(payload));
  } catch {
    // キャッシュ書込み失敗は予報表示の失敗にしない。
  }
}

export async function fetchFishingEnvironment(point: EnvironmentPoint, signalOrOptions?: AbortSignal | FetchOptions): Promise<FishingEnvironment> {
  const options = signalOrOptions instanceof AbortSignal ? { signal: signalOrOptions } : (signalOrOptions ?? {});
  const storage = options.storage === undefined ? getLocalStorage() : options.storage;
  const now = options.now ?? (() => new Date());
  const cached = readCachedFishingEnvironment(point, storage, now);

  try {
    const latest = await fetchLatestFishingEnvironment(point, options);
    writeCachedFishingEnvironment(latest, storage, now);
    return latest;
  } catch (error) {
    if (isCallerAbort(error, options.signal)) throw error;
    if (cached) {
      return {
        ...cached,
        fetchStatus: cached.weatherAvailable && cached.marineAvailable ? "success" : "partial",
        warning: "Open-Meteo APIから最新データを取得できないため、24時間以内のキャッシュを表示しています。",
      };
    }
    throw error;
  }
}

export async function fetchLatestFishingEnvironment(point: EnvironmentPoint, signalOrOptions?: AbortSignal | FetchOptions): Promise<FishingEnvironment> {
  const options = signalOrOptions instanceof AbortSignal ? { signal: signalOrOptions } : (signalOrOptions ?? {});
  const now = options.now ?? (() => new Date());
  const [weatherResult, marineResult] = await Promise.allSettled([
    fetchOpenMeteoWeather(point, options),
    fetchOpenMeteoMarineRows(point, options),
  ]);

  if (options.signal?.aborted) throw new DOMException("Open-Meteo request was aborted.", "AbortError");

  const weatherRows = weatherResult.status === "fulfilled" ? weatherResult.value.rows : [];
  const dailySun = weatherResult.status === "fulfilled" ? weatherResult.value.dailySun : [];
  const marineRows = marineResult.status === "fulfilled" ? marineResult.value : [];
  const hourly = mergeHourlyRows(weatherRows, marineRows);
  const weatherAvailable = hourly.some((row) => row.weather !== null);
  const marineAvailable = hourly.some((row) => row.marine !== null);

  if (!weatherAvailable && !marineAvailable) throw new Error("Open-Meteo weather and marine requests failed.");

  return {
    point,
    hourly,
    dailySun,
    weatherAvailable,
    marineAvailable,
    fetchedAt: now().toISOString(),
    sourceName: "Open-Meteo Weather Forecast API / Marine Weather API",
    sourceUrl: "https://open-meteo.com/",
    cacheStatus: "fresh",
    fetchStatus: weatherAvailable && marineAvailable ? "success" : "partial",
    warning: weatherAvailable && marineAvailable ? null : "Open-Meteoの一部APIのみ取得できました。取得済みの項目だけ表示します。",
    tideReference: getTideReferenceForSpot(point.spotId),
  };
}

export async function fetchOpenMeteoWeatherRows(point: EnvironmentPoint, signalOrOptions?: AbortSignal | FetchOptions): Promise<EnvironmentForecastRow[]> {
  return (await fetchOpenMeteoWeather(point, signalOrOptions)).rows;
}

async function fetchOpenMeteoWeather(point: EnvironmentPoint, signalOrOptions?: AbortSignal | FetchOptions) {
  const options = signalOrOptions instanceof AbortSignal ? { signal: signalOrOptions } : (signalOrOptions ?? {});
  const data = await fetchJson(buildOpenMeteoUrl(WEATHER_ENDPOINT, point, weatherHourlyFields, { daily: true }), options);
  const rows = normalizeTimes(data.hourly?.time)
    .map(({ forecastTime, originalIndex }) => buildWeatherRow(data.hourly, forecastTime, originalIndex))
    .filter((row): row is EnvironmentForecastRow => row !== null);
  const dates = Array.isArray(data.daily?.time) ? data.daily.time : [];
  const sunrises = Array.isArray(data.daily?.sunrise) ? data.daily.sunrise : [];
  const sunsets = Array.isArray(data.daily?.sunset) ? data.daily.sunset : [];
  const dailySun = dates.flatMap((date, index) =>
    typeof date === "string" && typeof sunrises[index] === "string" && typeof sunsets[index] === "string"
      ? [{ date, sunrise: sunrises[index] as string, sunset: sunsets[index] as string }]
      : [],
  );
  return { rows, dailySun };
}

export async function fetchOpenMeteoMarineRows(point: EnvironmentPoint, signalOrOptions?: AbortSignal | FetchOptions): Promise<EnvironmentForecastRow[]> {
  const options = signalOrOptions instanceof AbortSignal ? { signal: signalOrOptions } : (signalOrOptions ?? {});
  const data = await fetchJson(buildOpenMeteoUrl(MARINE_ENDPOINT, point, marineHourlyFields, { cellSelection: "sea" }), options);
  return normalizeTimes(data.hourly?.time)
    .map(({ forecastTime, originalIndex }) => buildMarineRow(data.hourly, forecastTime, originalIndex))
    .filter((row): row is EnvironmentForecastRow => row !== null);
}

export function mergeHourlyRows(weatherRows: EnvironmentForecastRow[], marineRows: EnvironmentForecastRow[]) {
  const byTime = new Map<string, EnvironmentForecastRow>();

  for (const row of [...weatherRows, ...marineRows]) {
    const current = byTime.get(row.forecastTime) ?? { forecastTime: row.forecastTime, weather: null, marine: null };
    byTime.set(row.forecastTime, {
      ...current,
      weather: row.weather ?? current.weather,
      marine: row.marine ?? current.marine,
    });
  }

  return Array.from(byTime.values()).filter((row) => row.weather || row.marine).sort((a, b) => parseForecastTime(a.forecastTime).getTime() - parseForecastTime(b.forecastTime).getTime());
}

function buildWeatherRow(hourly: Record<string, unknown> | undefined, forecastTime: string, index: number): EnvironmentForecastRow | null {
  const weatherCode = getNumberAt(hourly?.weather_code, index);
  const windDirectionDegrees = getNumberAt(hourly?.wind_direction_10m, index);
  const weather: WeatherEnvironment = {
    temperatureCelsius: getNumberAt(hourly?.temperature_2m, index),
    weatherCode,
    weatherLabel: getWeatherCodeLabel(weatherCode),
    precipitationMm: getNumberAt(hourly?.precipitation, index),
    precipitationProbabilityPercent: getNumberAt(hourly?.precipitation_probability, index),
    windSpeedKmh: getNumberAt(hourly?.wind_speed_10m, index),
    windDirectionDegrees,
    windDirectionLabel: getCompassDirection(windDirectionDegrees),
    windGustKmh: getNumberAt(hourly?.wind_gusts_10m, index),
    observedAt: forecastTime,
  };

  return hasValidWeatherValue(weather) ? { forecastTime, weather, marine: null } : null;
}

function buildMarineRow(hourly: Record<string, unknown> | undefined, forecastTime: string, index: number): EnvironmentForecastRow | null {
  const currentDirectionDegrees = getNumberAt(hourly?.ocean_current_direction, index);
  const waveDirectionDegrees = getNumberAt(hourly?.wave_direction, index);
  const marine: MarineEnvironment = {
    seaSurfaceTemperatureCelsius: getNumberAt(hourly?.sea_surface_temperature, index),
    seaLevelHeightMslMeters: getNumberAt(hourly?.sea_level_height_msl, index),
    waveHeightMeters: getNumberAt(hourly?.wave_height, index),
    waveDirectionDegrees,
    waveDirectionLabel: getCompassDirection(waveDirectionDegrees),
    wavePeriodSeconds: getNumberAt(hourly?.wave_period, index),
    oceanCurrentVelocityKmh: getNumberAt(hourly?.ocean_current_velocity, index),
    oceanCurrentDirectionDegrees: currentDirectionDegrees,
    oceanCurrentDirectionLabel: getCompassDirection(currentDirectionDegrees),
    observedAt: forecastTime,
  };

  return hasValidMarineValue(marine) ? { forecastTime, weather: null, marine } : null;
}

function buildOpenMeteoUrl(
  endpoint: string,
  point: EnvironmentPoint,
  hourlyFields: string[],
  options: { cellSelection?: "sea" | "nearest"; daily?: boolean } = {},
) {
  const params = new URLSearchParams({
    latitude: point.latitude.toString(),
    longitude: point.longitude.toString(),
    hourly: hourlyFields.join(","),
    timezone: "Asia/Tokyo",
    forecast_days: "7",
  });

  if (options.cellSelection) params.set("cell_selection", options.cellSelection);
  if (options.daily) params.set("daily", "sunrise,sunset");
  return `${endpoint}?${params.toString()}`;
}

async function fetchJson(url: string, options: FetchOptions): Promise<HourlyResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeout = createTimeoutSignal(options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const combined = combineAbortSignals(options.signal, timeout.signal);

  try {
    const response = await fetchImpl(url, { signal: combined.signal });
    if (!response.ok) throw new Error(`Open-Meteo request failed: ${response.status}`);
    return (await response.json()) as HourlyResponse;
  } finally {
    combined.cleanup();
    timeout.cleanup();
  }
}

function combineAbortSignals(signal: AbortSignal | undefined, timeoutSignal: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  if (!signal) return { signal: timeoutSignal, cleanup: () => undefined };
  if (typeof AbortSignal.any === "function") return { signal: AbortSignal.any([signal, timeoutSignal]), cleanup: () => undefined };

  const controller = new AbortController();
  const abortFromParent = () => controller.abort(signal.reason);
  const abortFromTimeout = () => controller.abort(timeoutSignal.reason);
  signal.addEventListener("abort", abortFromParent, { once: true });
  timeoutSignal.addEventListener("abort", abortFromTimeout, { once: true });
  return {
    signal: controller.signal,
    cleanup: () => {
      signal.removeEventListener("abort", abortFromParent);
      timeoutSignal.removeEventListener("abort", abortFromTimeout);
    },
  };
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new DOMException("Open-Meteo request timed out.", "TimeoutError")), timeoutMs);
  return { signal: controller.signal, cleanup: () => clearTimeout(timeoutId) };
}

function normalizeTimes(value: unknown): NormalizedTime[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, originalIndex) => (typeof item === "string" && Number.isFinite(parseForecastTime(item).getTime()) ? [{ forecastTime: item, originalIndex }] : []));
}

function getNumberAt(value: unknown, index: number) {
  if (!Array.isArray(value)) return null;
  const item = value[index];
  return typeof item === "number" && Number.isFinite(item) ? item : null;
}

function getLocalStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function isCallerAbort(error: unknown, signal: AbortSignal | undefined) {
  return isAbortError(error) && signal?.aborted;
}

export function isFishingEnvironmentLike(value: unknown): value is FishingEnvironment {
  if (!isRecord(value)) return false;
  if (!isPoint(value.point) || !Array.isArray(value.hourly) || value.hourly.length === 0) return false;
  if (!Array.isArray(value.dailySun) || !value.dailySun.every(isDailySunLike)) return false;
  if (typeof value.weatherAvailable !== "boolean" || typeof value.marineAvailable !== "boolean") return false;
  if (!isValidDate(value.fetchedAt) || typeof value.sourceName !== "string" || typeof value.sourceUrl !== "string") return false;
  if (!["fresh", "cache-fresh", "cache-stale", "none"].includes(String(value.cacheStatus))) return false;
  if (!["success", "partial", "failed"].includes(String(value.fetchStatus))) return false;
  if (!(value.warning === null || typeof value.warning === "string") || !isTideReference(value.tideReference)) return false;
  if (!value.hourly.every(isEnvironmentForecastRowLike)) return false;

  const hasWeather = value.hourly.some((row) => row.weather !== null);
  const hasMarine = value.hourly.some((row) => row.marine !== null);
  if (hasWeather !== value.weatherAvailable || hasMarine !== value.marineAvailable) return false;
  if (!value.weatherAvailable && !value.hourly.every((row) => row.weather === null)) return false;
  if (!value.marineAvailable && !value.hourly.every((row) => row.marine === null)) return false;
  return true;
}

function isDailySunLike(value: unknown) {
  return isRecord(value) && typeof value.date === "string" && isValidDate(value.sunrise) && isValidDate(value.sunset);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPoint(value: unknown) {
  return isRecord(value) && typeof value.spotId === "string" && typeof value.spotName === "string" && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
}

function isTideReference(value: unknown) {
  return isRecord(value) && typeof value.spotId === "string" && (value.referenceName === null || typeof value.referenceName === "string") && typeof value.url === "string" && typeof value.note === "string";
}

function isEnvironmentForecastRowLike(row: unknown): row is EnvironmentForecastRow {
  return isRecord(row) && isValidDate(row.forecastTime) && isWeatherLikeOrNull(row.weather) && isMarineLikeOrNull(row.marine) && (row.weather !== null || row.marine !== null);
}

function isWeatherLikeOrNull(value: unknown): value is WeatherEnvironment | null {
  return value === null || (isRecord(value) && weatherNumberKeys.every((key) => isFiniteNumberOrNull(value[key])) && typeof value.weatherLabel === "string" && typeof value.windDirectionLabel === "string" && isValidDate(value.observedAt) && hasValidWeatherValue(value as WeatherEnvironment));
}

function isMarineLikeOrNull(value: unknown): value is MarineEnvironment | null {
  return value === null || (isRecord(value) && marineNumberKeys.every((key) => isFiniteNumberOrNull(value[key])) && typeof value.waveDirectionLabel === "string" && typeof value.oceanCurrentDirectionLabel === "string" && isValidDate(value.observedAt) && hasValidMarineValue(value as MarineEnvironment));
}

function hasValidWeatherValue(weather: WeatherEnvironment) {
  return weatherNumberKeys.some((key) => typeof weather[key] === "number" && Number.isFinite(weather[key]));
}

function hasValidMarineValue(marine: MarineEnvironment) {
  return marineNumberKeys.some((key) => typeof marine[key] === "number" && Number.isFinite(marine[key]));
}

function isFiniteNumberOrNull(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isValidDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(parseForecastTime(value).getTime());
}
