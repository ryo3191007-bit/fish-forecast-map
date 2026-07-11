import {
  getCompassDirection,
  getWeatherCodeLabel,
  type EnvironmentPoint,
  type FishingEnvironment,
  type FishingEnvironmentHourly,
  type MarineEnvironment,
  type TideReference,
  type WeatherEnvironment,
} from "@/domain/environment";

const VERSION = "post-mvp-033.1" as const;
const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const MARINE_ENDPOINT = "https://marine-api.open-meteo.com/v1/marine";
const FRESH_MS = 30 * 60 * 1000;
const FALLBACK_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 10_000;

const weatherHourlyFields = ["temperature_2m", "weather_code", "precipitation", "precipitation_probability", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"];
const marineHourlyFields = ["sea_surface_temperature", "sea_level_height_msl", "wave_height", "wave_direction", "wave_period", "ocean_current_velocity", "ocean_current_direction"];
const weatherKeys = ["temperatureCelsius", "weatherCode", "precipitationMm", "precipitationProbabilityPercent", "windSpeedKmh", "windDirectionDegrees", "windGustKmh"] as const;
const marineKeys = ["seaSurfaceTemperatureCelsius", "seaLevelHeightMslMeters", "waveHeightMeters", "waveDirectionDegrees", "wavePeriodSeconds", "oceanCurrentVelocityKmh", "oceanCurrentDirectionDegrees"] as const;

type HourlyResponse = { hourly?: Record<string, unknown> };
type FetchImpl = (input: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<HourlyResponse> }>;
type StorageLike = Pick<Storage, "getItem" | "setItem">;
type FetchOptions = { signal?: AbortSignal; fetchImpl?: FetchImpl; timeoutMs?: number; storage?: StorageLike | null; now?: () => Date };
type NormalizedTime = { forecastTime: string; originalIndex: number };

export async function fetchFishingEnvironment(point: EnvironmentPoint, signalOrOptions?: AbortSignal | FetchOptions): Promise<FishingEnvironment> {
  const options = signalOrOptions instanceof AbortSignal ? { signal: signalOrOptions } : (signalOrOptions ?? {});
  const now = options.now ?? (() => new Date());
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const cacheKey = getCacheKey(point);
  const cached = readCachedEnvironment(storage, cacheKey, now);
  if (cached?.cacheStatus === "fresh") return cached;

  try {
    const [weatherResult, marineResult] = await Promise.allSettled([
      fetchOpenMeteoWeatherRows(point, options),
      fetchOpenMeteoMarineRows(point, options),
    ]);
    if (options.signal?.aborted) throw abortError();
    const weatherRows = weatherResult.status === "fulfilled" ? weatherResult.value : [];
    const marineRows = marineResult.status === "fulfilled" ? marineResult.value : [];
    const hourly = mergeHourlyRows(weatherRows, marineRows);
    const weatherAvailable = hourly.some((row) => row.weather !== null);
    const marineAvailable = hourly.some((row) => row.marine !== null);
    if (!weatherAvailable && !marineAvailable) throw new Error("Open-Meteo rows were empty or invalid.");
    const environment: FishingEnvironment = {
      version: VERSION,
      point,
      hourly,
      weather: nearestHourly(hourly, now()).weather,
      marine: nearestHourly(hourly, now()).marine,
      weatherAvailable,
      marineAvailable,
      fetchedAt: now().toISOString(),
      sourceName: "Open-Meteo Weather Forecast API / Marine Weather API",
      sourceUrl: "https://open-meteo.com/",
      cacheStatus: "miss",
      fetchStatus: weatherAvailable && marineAvailable ? "success" : "partial",
      warning: weatherAvailable && marineAvailable ? null : "Open-Meteoの一部データのみ表示しています。",
      tideReference: getTideReference(point),
    };
    writeCachedEnvironment(storage, cacheKey, environment);
    return environment;
  } catch (error) {
    if (isAbortError(error) && options.signal?.aborted) throw error;
    if (cached?.cacheStatus === "stale-fallback") return { ...cached, fetchStatus: "fallback", warning: "Open-Meteo取得失敗のため24時間以内のキャッシュを表示しています。" };
    throw error;
  }
}

export async function fetchOpenMeteoWeather(point: EnvironmentPoint, signal?: AbortSignal): Promise<WeatherEnvironment | null> {
  const rows = await fetchOpenMeteoWeatherRows(point, { signal });
  return nearestHourly(rows.map((weather) => ({ forecastTime: weather.observedAt, weather, marine: null })), new Date()).weather;
}

export async function fetchOpenMeteoMarine(point: EnvironmentPoint, signal?: AbortSignal): Promise<MarineEnvironment | null> {
  const rows = await fetchOpenMeteoMarineRows(point, { signal });
  return nearestHourly(rows.map((marine) => ({ forecastTime: marine.observedAt, weather: null, marine })), new Date()).marine;
}

async function fetchOpenMeteoWeatherRows(point: EnvironmentPoint, options: FetchOptions): Promise<WeatherEnvironment[]> {
  const data = await fetchJson(buildOpenMeteoUrl(WEATHER_ENDPOINT, point, weatherHourlyFields), options);
  return normalizeTimes(data.hourly?.time).map(({ forecastTime, originalIndex }) => buildWeather(data.hourly, forecastTime, originalIndex)).filter((row): row is WeatherEnvironment => row !== null);
}

async function fetchOpenMeteoMarineRows(point: EnvironmentPoint, options: FetchOptions): Promise<MarineEnvironment[]> {
  const data = await fetchJson(buildOpenMeteoUrl(MARINE_ENDPOINT, point, marineHourlyFields, { cellSelection: "sea" }), options);
  return normalizeTimes(data.hourly?.time).map(({ forecastTime, originalIndex }) => buildMarine(data.hourly, forecastTime, originalIndex)).filter((row): row is MarineEnvironment => row !== null);
}

function buildWeather(hourly: Record<string, unknown> | undefined, forecastTime: string, index: number): WeatherEnvironment | null {
  const weatherCode = getNumberAt(hourly?.weather_code, index);
  const windDirectionDegrees = getNumberAt(hourly?.wind_direction_10m, index);
  const row = { temperatureCelsius: getNumberAt(hourly?.temperature_2m, index), weatherCode, weatherLabel: getWeatherCodeLabel(weatherCode), precipitationMm: getNumberAt(hourly?.precipitation, index), precipitationProbabilityPercent: getNumberAt(hourly?.precipitation_probability, index), windSpeedKmh: getNumberAt(hourly?.wind_speed_10m, index), windDirectionDegrees, windDirectionLabel: getCompassDirection(windDirectionDegrees), windGustKmh: getNumberAt(hourly?.wind_gusts_10m, index), observedAt: forecastTime };
  return weatherKeys.some((key) => row[key] !== null) ? row : null;
}

function buildMarine(hourly: Record<string, unknown> | undefined, forecastTime: string, index: number): MarineEnvironment | null {
  const waveDirectionDegrees = getNumberAt(hourly?.wave_direction, index);
  const oceanCurrentDirectionDegrees = getNumberAt(hourly?.ocean_current_direction, index);
  const row = { seaSurfaceTemperatureCelsius: getNumberAt(hourly?.sea_surface_temperature, index), seaLevelHeightMslMeters: getNumberAt(hourly?.sea_level_height_msl, index), waveHeightMeters: getNumberAt(hourly?.wave_height, index), waveDirectionDegrees, waveDirectionLabel: getCompassDirection(waveDirectionDegrees), wavePeriodSeconds: getNumberAt(hourly?.wave_period, index), oceanCurrentVelocityKmh: getNumberAt(hourly?.ocean_current_velocity, index), oceanCurrentDirectionDegrees, oceanCurrentDirectionLabel: getCompassDirection(oceanCurrentDirectionDegrees), observedAt: forecastTime };
  return marineKeys.some((key) => row[key] !== null) ? row : null;
}

function normalizeTimes(value: unknown): NormalizedTime[] {
  return Array.isArray(value) ? value.flatMap((item, originalIndex) => (typeof item === "string" && Number.isFinite(Date.parse(item)) ? [{ forecastTime: item, originalIndex }] : [])) : [];
}

function mergeHourlyRows(weatherRows: WeatherEnvironment[], marineRows: MarineEnvironment[]): FishingEnvironmentHourly[] {
  const byTime = new Map<string, FishingEnvironmentHourly>();
  for (const weather of weatherRows) byTime.set(weather.observedAt, { forecastTime: weather.observedAt, weather, marine: byTime.get(weather.observedAt)?.marine ?? null });
  for (const marine of marineRows) byTime.set(marine.observedAt, { forecastTime: marine.observedAt, weather: byTime.get(marine.observedAt)?.weather ?? null, marine });
  return [...byTime.values()].filter((row) => row.weather || row.marine).sort((a, b) => Date.parse(a.forecastTime) - Date.parse(b.forecastTime));
}

function nearestHourly(hourly: FishingEnvironmentHourly[], date: Date): FishingEnvironmentHourly {
  return hourly.reduce((best, row) => (Math.abs(Date.parse(row.forecastTime) - date.getTime()) < Math.abs(Date.parse(best.forecastTime) - date.getTime()) ? row : best), hourly[0] ?? { forecastTime: date.toISOString(), weather: null, marine: null });
}

function buildOpenMeteoUrl(endpoint: string, point: EnvironmentPoint, hourlyFields: string[], options: { cellSelection?: "sea" | "nearest" } = {}) {
  const params = new URLSearchParams({ latitude: point.latitude.toString(), longitude: point.longitude.toString(), hourly: hourlyFields.join(","), timezone: "Asia/Tokyo", forecast_days: "7" });
  if (options.cellSelection) params.set("cell_selection", options.cellSelection);
  return `${endpoint}?${params.toString()}`;
}

async function fetchJson(url: string, options: FetchOptions): Promise<HourlyResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeout = createTimeoutSignal(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const signal = combineSignals(options.signal, timeout.signal);
  try {
    const response = await fetchImpl(url, { signal });
    if (!response.ok) throw new Error(`Open-Meteo request failed: ${response.status}`);
    return response.json();
  } finally {
    timeout.cleanup();
  }
}

function combineSignals(parent: AbortSignal | undefined, timeout: AbortSignal) {
  if (!parent) return timeout;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([parent, timeout]);
  const controller = new AbortController();
  const abort = () => controller.abort();
  parent.addEventListener("abort", abort, { once: true });
  timeout.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

function getNumberAt(value: unknown, index: number) {
  if (!Array.isArray(value)) return null;
  const item = value[index];
  return typeof item === "number" && Number.isFinite(item) ? item : null;
}

function getCacheKey(point: EnvironmentPoint) { return `fish-forecast-environment:${VERSION}:${point.spotId}:${point.latitude}:${point.longitude}`; }
function getBrowserStorage(): StorageLike | null { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } }
function readCachedEnvironment(storage: StorageLike | null, key: string, now: () => Date): FishingEnvironment | null { try { const raw = storage?.getItem(key); if (!raw) return null; const parsed = JSON.parse(raw) as unknown; if (!isFishingEnvironmentLike(parsed)) return null; const age = now().getTime() - Date.parse(parsed.fetchedAt); if (age < 0 || age > FALLBACK_MS) return null; return { ...parsed, cacheStatus: age <= FRESH_MS ? "fresh" : "stale-fallback" }; } catch { return null; } }
function writeCachedEnvironment(storage: StorageLike | null, key: string, value: FishingEnvironment) { try { storage?.setItem(key, JSON.stringify(value)); } catch { /* ignore storage quota/private-mode errors */ } }

export function isFishingEnvironmentLike(value: unknown): value is FishingEnvironment {
  if (!isRecord(value) || value.version !== VERSION || !validDate(value.fetchedAt) || !isPoint(value.point) || !Array.isArray(value.hourly) || typeof value.weatherAvailable !== "boolean" || typeof value.marineAvailable !== "boolean" || typeof value.sourceName !== "string" || typeof value.sourceUrl !== "string" || !["fresh", "stale-fallback", "miss", "unavailable"].includes(String(value.cacheStatus)) || !["success", "partial", "fallback"].includes(String(value.fetchStatus)) || !(value.warning === null || typeof value.warning === "string") || !isTideReference(value.tideReference)) return false;
  const rows = value.hourly;
  if (!rows.every(isHourlyRow) || rows.length === 0) return false;
  const hasWeather = rows.some((row) => row.weather !== null);
  const hasMarine = rows.some((row) => row.marine !== null);
  return hasWeather === value.weatherAvailable && hasMarine === value.marineAvailable && isWeatherOrNull(value.weather) && isMarineOrNull(value.marine);
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function validDate(value: unknown) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function numOrNull(value: unknown) { return value === null || (typeof value === "number" && Number.isFinite(value)); }
function str(value: unknown) { return typeof value === "string"; }
function isPoint(value: unknown) { return isRecord(value) && str(value.spotId) && str(value.spotName) && Number.isFinite(value.latitude) && Number.isFinite(value.longitude); }
function isTideReference(value: unknown) { return isRecord(value) && str(value.spotId) && str(value.referenceName) && str(value.url) && str(value.note); }
function isWeatherOrNull(value: unknown): value is WeatherEnvironment | null { return value === null || (isRecord(value) && weatherKeys.every((key) => numOrNull(value[key])) && str(value.weatherLabel) && str(value.windDirectionLabel) && validDate(value.observedAt)); }
function isMarineOrNull(value: unknown): value is MarineEnvironment | null { return value === null || (isRecord(value) && marineKeys.every((key) => numOrNull(value[key])) && str(value.waveDirectionLabel) && str(value.oceanCurrentDirectionLabel) && validDate(value.observedAt)); }
function isHourlyRow(value: unknown): value is FishingEnvironmentHourly { return isRecord(value) && validDate(value.forecastTime) && isWeatherOrNull(value.weather) && isMarineOrNull(value.marine) && (value.weather !== null || value.marine !== null); }
function isAbortError(error: unknown) { return error instanceof DOMException && error.name === "AbortError"; }
function abortError() { return new DOMException("Open-Meteo request was aborted.", "AbortError"); }
export function getTideReference(point: EnvironmentPoint): TideReference { const known = point.spotId.includes("hirado") ? "平戸" : point.spotId.includes("imari") ? "伊万里" : point.spotId.includes("karatsu") ? "唐津" : "博多"; return { spotId: point.spotId, referenceName: known, url: "https://www.data.jma.go.jp/kaiyou/db/tide/suisan/", note: "気象庁公式潮位表の参照候補地点です。アプリ内の潮位はOpen-Meteoの参考値で公式時刻ではありません。" }; }
