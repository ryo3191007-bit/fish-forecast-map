export type EnvironmentPoint = { spotName: string; latitude: number; longitude: number };

export type WeatherEnvironment = {
  temperatureCelsius: number | null; weatherCode: number | null; weatherLabel: string; precipitationMm: number | null;
  precipitationProbabilityPercent: number | null; windSpeedKmh: number | null; windDirectionDegrees: number | null;
  windDirectionLabel: string; windGustKmh: number | null; observedAt: string | null;
};

export type MarineEnvironment = {
  seaSurfaceTemperatureCelsius: number | null; seaLevelHeightMslMeters: number | null; waveHeightMeters: number | null;
  waveDirectionDegrees: number | null; waveDirectionLabel: string; wavePeriodSeconds: number | null;
  oceanCurrentVelocityKmh: number | null; oceanCurrentDirectionDegrees: number | null; oceanCurrentDirectionLabel: string; observedAt: string | null;
};

export type EnvironmentForecastRow = { forecastTime: string; weather: WeatherEnvironment | null; marine: MarineEnvironment | null };
export type EnvironmentDataAvailability = "full" | "weather-only" | "marine-only" | "none";
export type EnvironmentCacheStatus = "fresh" | "cache-fresh" | "cache-stale" | "none";
export type EnvironmentFetchStatus = "success" | "partial" | "failed";
export type TideReference = { spotId: string; referenceName: string | null; url: string; note: string };

export type FishingEnvironment = {
  point: EnvironmentPoint; hourly: EnvironmentForecastRow[]; weatherAvailable: boolean; marineAvailable: boolean;
  fetchedAt: string; sourceName: string; sourceUrl: string; cacheStatus: EnvironmentCacheStatus; fetchStatus: EnvironmentFetchStatus;
  warning: string | null; tideReference: TideReference;
};

export const JMA_TIDE_TABLE_URL = "https://www.data.jma.go.jp/kaiyou/db/tide/suisan/index.php";

const tideReferenceBySpotId: Record<string, string> = {
  keya: "博多", nogita: "博多", karatsu: "唐津", yobuko: "仮屋", imari: "伊万里", hirado: "平戸瀬戸",
};

export function getTideReferenceForSpot(spotId: string): TideReference {
  const referenceName = tideReferenceBySpotId[spotId] ?? null;
  return {
    spotId,
    referenceName,
    url: JMA_TIDE_TABLE_URL,
    note: referenceName ? "手動レビューした参照候補です。公式ページで地点を選び直して確認してください。" : "参照地点未設定です。誤った地点へ自動リンクしません。",
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
  return new Date(value.includes("T") ? `${value}:00+09:00` : value);
}
