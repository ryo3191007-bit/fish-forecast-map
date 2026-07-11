export type EnvironmentPoint = {
  spotId: string;
  spotName: string;
  latitude: number;
  longitude: number;
};

export type WeatherEnvironment = {
  temperatureCelsius: number | null;
  weatherCode: number | null;
  weatherLabel: string;
  precipitationMm: number | null;
  precipitationProbabilityPercent: number | null;
  windSpeedKmh: number | null;
  windDirectionDegrees: number | null;
  windDirectionLabel: string;
  windGustKmh: number | null;
  observedAt: string;
};

export type MarineEnvironment = {
  seaSurfaceTemperatureCelsius: number | null;
  seaLevelHeightMslMeters: number | null;
  waveHeightMeters: number | null;
  waveDirectionDegrees: number | null;
  waveDirectionLabel: string;
  wavePeriodSeconds: number | null;
  oceanCurrentVelocityKmh: number | null;
  oceanCurrentDirectionDegrees: number | null;
  oceanCurrentDirectionLabel: string;
  observedAt: string;
};

export type FishingEnvironmentHourly = {
  forecastTime: string;
  weather: WeatherEnvironment | null;
  marine: MarineEnvironment | null;
};

export type TideReference = {
  spotId: string;
  referenceName: string;
  url: string;
  note: string;
};

export type CacheStatus = "fresh" | "stale-fallback" | "miss" | "unavailable";
export type FetchStatus = "success" | "partial" | "fallback";

export type FishingEnvironment = {
  version: "post-mvp-033.1";
  point: EnvironmentPoint;
  hourly: FishingEnvironmentHourly[];
  weather: WeatherEnvironment | null;
  marine: MarineEnvironment | null;
  weatherAvailable: boolean;
  marineAvailable: boolean;
  fetchedAt: string;
  sourceName: string;
  sourceUrl: string;
  cacheStatus: CacheStatus;
  fetchStatus: FetchStatus;
  warning: string | null;
  tideReference: TideReference;
};

export type TideEvent = {
  type: "high" | "low";
  forecastTime: string;
  seaLevelHeightMslMeters: number;
};

export type TideCycle = "大潮" | "中潮" | "小潮" | "長潮" | "若潮";

export function getWeatherCodeLabel(code: number | null) {
  if (code === null) return "データなし";
  if (code === 0) return "快晴";
  if ([1, 2, 3].includes(code)) return "晴れ〜くもり";
  if ([45, 48].includes(code)) return "霧";
  if ([51, 53, 55, 56, 57].includes(code)) return "霧雨";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "雨";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "雪";
  if ([95, 96, 99].includes(code)) return "雷雨";
  return `weather_code ${code}`;
}

export function getCompassDirection(degrees: number | null) {
  if (degrees === null) return "データなし";
  const directions = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
  return directions[Math.round(degrees / 45) % directions.length];
}

export function getTideCycleForDate(date: string | Date): TideCycle {
  const day = Math.floor((new Date(date).getTime() - Date.UTC(2026, 6, 10)) / 86400000);
  const age = ((day % 30) + 30) % 30;
  if (age <= 1 || age >= 28 || (age >= 14 && age <= 16)) return "大潮";
  if ((age >= 2 && age <= 5) || (age >= 11 && age <= 13) || (age >= 17 && age <= 20) || (age >= 26 && age <= 27)) return "中潮";
  if ((age >= 6 && age <= 8) || (age >= 21 && age <= 23)) return "小潮";
  if (age === 9 || age === 24) return "長潮";
  return "若潮";
}

function tokyoDateKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export function getTideEventsForDate(hourly: FishingEnvironmentHourly[], dateKey: string): TideEvent[] {
  const valid = hourly
    .map((row) => ({ row, value: row.marine?.seaLevelHeightMslMeters ?? null }))
    .filter((item): item is { row: FishingEnvironmentHourly; value: number } => Number.isFinite(item.value))
    .sort((a, b) => Date.parse(a.row.forecastTime) - Date.parse(b.row.forecastTime));
  const events: TideEvent[] = [];
  for (let index = 0; index < valid.length; index += 1) {
    const prev = valid[index - 1];
    const current = valid[index];
    const next = valid[index + 1];
    if (!prev || !next || tokyoDateKey(current.row.forecastTime) !== dateKey) continue;
    const high = current.value >= prev.value && current.value > next.value;
    const low = current.value <= prev.value && current.value < next.value;
    if (high || low) events.push({ type: high ? "high" : "low", forecastTime: current.row.forecastTime, seaLevelHeightMslMeters: current.value });
  }
  return Array.from(new Map(events.map((event) => [`${event.type}-${event.forecastTime}`, event])).values()).sort((a, b) => Date.parse(a.forecastTime) - Date.parse(b.forecastTime));
}
