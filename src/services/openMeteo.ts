import {
  getCompassDirection,
  getWeatherCodeLabel,
  type EnvironmentPoint,
  type FishingEnvironment,
  type MarineEnvironment,
  type WeatherEnvironment,
} from "@/domain/environment";

const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const MARINE_ENDPOINT = "https://marine-api.open-meteo.com/v1/marine";

const weatherHourlyFields = [
  "temperature_2m",
  "weather_code",
  "precipitation",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
];

const marineHourlyFields = [
  "sea_surface_temperature",
  "sea_level_height_msl",
  "wave_height",
  "ocean_current_velocity",
  "ocean_current_direction",
];

type HourlyResponse = {
  hourly?: Record<string, unknown>;
};

export async function fetchFishingEnvironment(point: EnvironmentPoint, signal?: AbortSignal): Promise<FishingEnvironment> {
  const [weather, marine] = await Promise.all([
    fetchOpenMeteoWeather(point, signal),
    fetchOpenMeteoMarine(point, signal),
  ]);

  return {
    point,
    weather,
    marine,
    fetchedAt: new Date().toISOString(),
    sourceName: "Open-Meteo Weather Forecast API / Marine Weather API",
    sourceUrl: "https://open-meteo.com/",
  };
}

export async function fetchOpenMeteoWeather(point: EnvironmentPoint, signal?: AbortSignal): Promise<WeatherEnvironment | null> {
  const data = await fetchJson(buildOpenMeteoUrl(WEATHER_ENDPOINT, point, weatherHourlyFields), signal);
  const hourly = data.hourly;
  if (!hourly) return null;

  const index = getNearestHourlyIndex(hourly.time);
  if (index === -1) return null;

  const weatherCode = getNumberAt(hourly.weather_code, index);
  const windDirectionDegrees = getNumberAt(hourly.wind_direction_10m, index);

  return {
    temperatureCelsius: getNumberAt(hourly.temperature_2m, index),
    weatherCode,
    weatherLabel: getWeatherCodeLabel(weatherCode),
    precipitationMm: getNumberAt(hourly.precipitation, index),
    windSpeedKmh: getNumberAt(hourly.wind_speed_10m, index),
    windDirectionDegrees,
    windDirectionLabel: getCompassDirection(windDirectionDegrees),
    windGustKmh: getNumberAt(hourly.wind_gusts_10m, index),
    observedAt: getStringAt(hourly.time, index),
  };
}

export async function fetchOpenMeteoMarine(point: EnvironmentPoint, signal?: AbortSignal): Promise<MarineEnvironment | null> {
  const data = await fetchJson(buildOpenMeteoUrl(MARINE_ENDPOINT, point, marineHourlyFields), signal);
  const hourly = data.hourly;
  if (!hourly) return null;

  const index = getNearestHourlyIndex(hourly.time);
  if (index === -1) return null;

  const currentDirectionDegrees = getNumberAt(hourly.ocean_current_direction, index);

  return {
    seaSurfaceTemperatureCelsius: getNumberAt(hourly.sea_surface_temperature, index),
    seaLevelHeightMslMeters: getNumberAt(hourly.sea_level_height_msl, index),
    waveHeightMeters: getNumberAt(hourly.wave_height, index),
    oceanCurrentVelocityKmh: getNumberAt(hourly.ocean_current_velocity, index),
    oceanCurrentDirectionDegrees: currentDirectionDegrees,
    oceanCurrentDirectionLabel: getCompassDirection(currentDirectionDegrees),
    observedAt: getStringAt(hourly.time, index),
  };
}

function buildOpenMeteoUrl(endpoint: string, point: EnvironmentPoint, hourlyFields: string[]) {
  const params = new URLSearchParams({
    latitude: point.latitude.toString(),
    longitude: point.longitude.toString(),
    hourly: hourlyFields.join(","),
    timezone: "Asia/Tokyo",
    forecast_days: "1",
  });

  return `${endpoint}?${params.toString()}`;
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<HourlyResponse> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Open-Meteo request failed: ${response.status}`);
  return response.json() as Promise<HourlyResponse>;
}

function getNearestHourlyIndex(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return -1;
  const now = Date.now();
  let nearestIndex = 0;
  let nearestDiff = Number.POSITIVE_INFINITY;

  value.forEach((time, index) => {
    if (typeof time !== "string") return;
    const diff = Math.abs(Date.parse(time) - now);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function getNumberAt(value: unknown, index: number) {
  if (!Array.isArray(value)) return null;
  const item = value[index];
  return typeof item === "number" && Number.isFinite(item) ? item : null;
}

function getStringAt(value: unknown, index: number) {
  if (!Array.isArray(value)) return null;
  const item = value[index];
  return typeof item === "string" ? item : null;
}
