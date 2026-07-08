export type EnvironmentPoint = {
  spotName: string;
  latitude: number;
  longitude: number;
};

export type WeatherEnvironment = {
  temperatureCelsius: number | null;
  weatherCode: number | null;
  weatherLabel: string;
  precipitationMm: number | null;
  windSpeedKmh: number | null;
  windDirectionDegrees: number | null;
  windDirectionLabel: string;
  windGustKmh: number | null;
  observedAt: string | null;
};

export type MarineEnvironment = {
  seaSurfaceTemperatureCelsius: number | null;
  seaLevelHeightMslMeters: number | null;
  waveHeightMeters: number | null;
  oceanCurrentVelocityKmh: number | null;
  oceanCurrentDirectionDegrees: number | null;
  oceanCurrentDirectionLabel: string;
  observedAt: string | null;
};

export type FishingEnvironment = {
  point: EnvironmentPoint;
  weather: WeatherEnvironment | null;
  marine: MarineEnvironment | null;
  fetchedAt: string;
  sourceName: string;
  sourceUrl: string;
};

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
