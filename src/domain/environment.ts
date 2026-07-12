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

export type EnvironmentForecastRow = {
  forecastTime: string;
  weather: WeatherEnvironment | null;
  marine: MarineEnvironment | null;
};

export type EnvironmentDataAvailability = "full" | "weather-only" | "marine-only" | "none";
export type EnvironmentCacheStatus = "fresh" | "cache-fresh" | "cache-stale" | "none";
export type EnvironmentFetchStatus = "success" | "partial" | "failed";
export type TidePhaseName = "大潮" | "中潮" | "小潮" | "長潮" | "若潮";

export type TideReference = {
  spotId: string;
  referenceName: string | null;
  url: string;
  note: string;
};

export type TideEvent = {
  type: "high" | "low";
  approximateTime: string;
  heightMeters: number;
};

export type FishingEnvironment = {
  point: EnvironmentPoint;
  hourly: EnvironmentForecastRow[];
  weatherAvailable: boolean;
  marineAvailable: boolean;
  fetchedAt: string;
  sourceName: string;
  sourceUrl: string;
  cacheStatus: EnvironmentCacheStatus;
  fetchStatus: EnvironmentFetchStatus;
  warning: string | null;
  tideReference: TideReference;
};

export const JMA_TIDE_TABLE_URL = "https://www.data.jma.go.jp/kaiyou/db/tide/suisan/index.php";

const tideReferenceBySpotId: Record<string, string> = {
  "nokita-port": "博多",
  "nokita-beach": "博多",
  "keya-port": "博多",
  "keya-gate": "博多",
  "funakoshi-port": "博多",
  "kishi-port": "博多",
  "fukuyoshi-port": "唐津",
  "hamasaki-beach": "唐津",
  "niji-matsubara": "唐津",
  "karatsu-east-port": "唐津",
  "karatsu-west-port": "唐津",
  "yobuko-area": "仮屋",
  "imari-inner-bay": "伊万里",
  "fukushima-area": "伊万里",
  "takashima-area": "伊万里",
  "tabira-port": "平戸瀬戸",
  "hirado-seto": "平戸瀬戸",
  "ikitsuki-area": "平戸瀬戸",
};

export function getTideReferenceForSpot(spotId: string): TideReference {
  const referenceName = tideReferenceBySpotId[spotId] ?? null;

  return {
    spotId,
    referenceName,
    url: JMA_TIDE_TABLE_URL,
    note: referenceName
      ? "手動レビューした参照候補です。公式ページで地点を選び直して確認してください。"
      : "参照地点未設定です。誤った地点へ自動リンクしません。",
  };
}

export function getFishingEnvironmentAvailability(environment: FishingEnvironment | null): EnvironmentDataAvailability {
  if (!environment) return "none";
  if (environment.weatherAvailable && environment.marineAvailable) return "full";
  if (environment.weatherAvailable) return "weather-only";
  if (environment.marineAvailable) return "marine-only";
  return "none";
}

export function getNearestForecastTime(rows: EnvironmentForecastRow[], now = new Date()) {
  if (rows.length === 0) return null;

  const nowTime = now.getTime();
  return rows.reduce((nearest, row) => {
    const currentDiff = Math.abs(parseForecastTime(row.forecastTime).getTime() - nowTime);
    const nearestDiff = Math.abs(parseForecastTime(nearest.forecastTime).getTime() - nowTime);
    return currentDiff < nearestDiff ? row : nearest;
  }).forecastTime;
}

export function getTidePhaseName(dateText: string): TidePhaseName {
  const synodicMonthDays = 29.530588853;
  const knownNewMoonUtc = Date.UTC(2000, 0, 6, 18, 14);
  const target = parseForecastTime(`${dateText}T12:00`).getTime();
  const daysSinceKnownNewMoon = (target - knownNewMoonUtc) / 86_400_000;
  const moonAge = ((daysSinceKnownNewMoon % synodicMonthDays) + synodicMonthDays) % synodicMonthDays;

  if (moonAge < 1.5 || moonAge >= 28 || (moonAge >= 13.5 && moonAge < 16.5)) return "大潮";
  if ((moonAge >= 1.5 && moonAge < 7.5) || (moonAge >= 16.5 && moonAge < 22.5)) return "中潮";
  if ((moonAge >= 7.5 && moonAge < 10.5) || (moonAge >= 22.5 && moonAge < 25.5)) return "小潮";
  if ((moonAge >= 10.5 && moonAge < 11.5) || (moonAge >= 25.5 && moonAge < 26.5)) return "長潮";
  return "若潮";
}

export function getTideEventsForDate(rows: EnvironmentForecastRow[], dateText: string): TideEvent[] {
  const tideRows = rows
    .map((row) => ({ time: row.forecastTime, dateKey: getTokyoDateKey(row.forecastTime), height: row.marine?.seaLevelHeightMslMeters }))
    .filter((row): row is { time: string; dateKey: string; height: number } => typeof row.height === "number" && Number.isFinite(row.height))
    .sort((a, b) => parseForecastTime(a.time).getTime() - parseForecastTime(b.time).getTime());

  const events: TideEvent[] = [];
  for (let index = 0; index < tideRows.length; index += 1) {
    const previous = tideRows[index - 1];
    const current = tideRows[index];
    const next = tideRows[index + 1];
    if (!previous || !next || current.dateKey !== dateText) continue;

    if (current.height >= previous.height && current.height >= next.height && (current.height > previous.height || current.height > next.height)) {
      events.push({ type: "high", approximateTime: current.time.slice(11, 16), heightMeters: current.height });
    }

    if (current.height <= previous.height && current.height <= next.height && (current.height < previous.height || current.height < next.height)) {
      events.push({ type: "low", approximateTime: current.time.slice(11, 16), heightMeters: current.height });
    }
  }

  return Array.from(new Map(events.map((event) => [`${event.type}:${event.approximateTime}`, event])).values()).slice(0, 6);
}

export type TideEventBadge = { type: TideEvent["type"]; label: "満潮" | "干潮" };

function getForecastDateHour(value: string) {
  const dateMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}):/.exec(value);
  if (dateMatch) return { dateKey: dateMatch[1], hour: dateMatch[2] };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parseForecastTime(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return { dateKey: `${part("year")}-${part("month")}-${part("day")}`, hour: part("hour") };
}

export function getTideEventBadgeForForecastTime(events: TideEvent[], forecastTime: string, eventDateKey: string): TideEventBadge | null {
  const forecast = getForecastDateHour(forecastTime);
  if (forecast.dateKey !== eventDateKey) return null;
  const event = events.find((candidate) => {
    const eventHour = /^(\d{2}):/.exec(candidate.approximateTime)?.[1];
    return eventHour === forecast.hour;
  });
  if (!event) return null;
  return { type: event.type, label: event.type === "high" ? "満潮" : "干潮" };
}

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

export function parseForecastTime(value: string) {
  if (!value.includes("T")) return new Date(value);
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(value)) return new Date(value);
  return new Date(value.length === 16 ? `${value}:00+09:00` : `${value}+09:00`);
}

export function getTokyoDateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(parseForecastTime(value));
}
