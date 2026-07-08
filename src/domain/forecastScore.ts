import type { FishSpecies, FishingMethod, FishingReport } from "@/domain/fishing";

export type ForecastInputReport = Omit<FishingReport, "forecast">;

type ScoreBand = {
  maxDays: number;
  points: number;
  label: string;
};

const SCORE_BASELINE = 25;
const SCORE_REFERENCE_DATE = "2026-07-01";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const RECENCY_BANDS: ScoreBand[] = [
  { maxDays: 3, points: 24, label: "3日以内の直近釣果" },
  { maxDays: 7, points: 21, label: "1週間以内の新しい釣果" },
  { maxDays: 14, points: 16, label: "2週間以内の釣果" },
  { maxDays: 30, points: 9, label: "1か月以内の釣果" },
  { maxDays: Number.POSITIVE_INFINITY, points: 4, label: "やや古い釣果" },
];

const CATCH_COUNT_WEIGHT = 2.1;
const CATCH_COUNT_MAX_POINTS = 20;
const SIZE_WEIGHT = 0.28;
const SIZE_MAX_POINTS = 14;
const SEASON_IN_POINTS = 14;
const SEASON_NEAR_POINTS = 8;
const SEASON_OFF_POINTS = 3;
const METHOD_GOOD_POINTS = 10;
const METHOD_OK_POINTS = 6;
const METHOD_OTHER_POINTS = 4;

const AREA_POINTS: Record<string, number> = {
  糸島西岸: 7,
  唐津湾: 8,
  唐津湾北部: 7,
  唐津湾西部: 7,
  伊万里湾: 6,
  平戸: 8,
};

const METHOD_AFFINITY: Partial<Record<FishingReport["species"], FishingMethod[]>> = {
  アジ: ["サビキ", "コマセ"],
  サバ: ["サビキ", "ジギング"],
  イワシ: ["サビキ"],
  青物: ["ジギング", "キャスティング", "泳がせ"],
  シイラ: ["キャスティング"],
  ヒラメ: ["泳がせ", "キャスティング"],
  マゴチ: ["キャスティング", "泳がせ"],
  シーバス: ["キャスティング"],
  アオリイカ: ["エギング"],
  ヤリイカ: ["エギング"],
  コウイカ: ["エギング"],
  チヌ: ["コマセ"],
  真鯛: ["コマセ", "泳がせ"],
  キス: ["その他"],
  根魚: ["その他", "ジギング"],
};

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const daysBetween = (fromDate: string, toDate: string) => {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  return Math.max(0, Math.floor((to - from) / MS_PER_DAY));
};

const getRecencyBand = (reportDate: string, referenceDate: string) => {
  const daysOld = daysBetween(reportDate, referenceDate);
  const band = RECENCY_BANDS.find(({ maxDays }) => daysOld <= maxDays) ?? RECENCY_BANDS[RECENCY_BANDS.length - 1];
  return { daysOld, ...band };
};

const getSeasonPoints = (report: ForecastInputReport, species: FishSpecies | undefined) => {
  const month = new Date(`${report.reportDate}T00:00:00Z`).getUTCMonth() + 1;
  const seasonMonths = species?.seasonMonths ?? [];
  if (seasonMonths.includes(month)) {
    return { points: SEASON_IN_POINTS, reason: `${report.species}のシーズン月(${month}月)に合うため季節性を加点` };
  }

  const nearSeason = seasonMonths.some((seasonMonth) => Math.abs(seasonMonth - month) === 1 || Math.abs(seasonMonth - month) === 11);
  if (nearSeason) {
    return { points: SEASON_NEAR_POINTS, reason: `${report.species}のシーズン前後(${month}月)として中程度に評価` };
  }

  return { points: SEASON_OFF_POINTS, reason: `${report.species}の主なシーズン外(${month}月)のため控えめ評価` };
};

const getMethodPoints = (report: ForecastInputReport) => {
  const methods = METHOD_AFFINITY[report.species] ?? [];
  if (methods.includes(report.method)) {
    return { points: METHOD_GOOD_POINTS, reason: `${report.species}と${report.method}の相性を評価` };
  }

  if (report.method === "その他") {
    return { points: METHOD_OTHER_POINTS, reason: "釣り方が汎用カテゴリのため控えめに加点" };
  }

  return { points: METHOD_OK_POINTS, reason: `${report.method}は対象魚種の代表的釣法ではないため中程度に評価` };
};

export function calculateForecastScore(
  report: ForecastInputReport,
  speciesList: FishSpecies[],
  referenceDate = SCORE_REFERENCE_DATE,
) {
  const species = speciesList.find(({ nameJa }) => nameJa === report.species);
  const recency = getRecencyBand(report.reportDate, referenceDate);
  const catchPoints = Math.min(report.catchCount * CATCH_COUNT_WEIGHT, CATCH_COUNT_MAX_POINTS);
  const sizePoints = Math.min(report.sizeCm * SIZE_WEIGHT, SIZE_MAX_POINTS);
  const season = getSeasonPoints(report, species);
  const method = getMethodPoints(report);
  const areaPoints = AREA_POINTS[report.areaName] ?? 5;

  const score = clampScore(SCORE_BASELINE + recency.points + catchPoints + sizePoints + season.points + method.points + areaPoints);

  return {
    score,
    reasons: [
      `${recency.label}（基準日${referenceDate}から${recency.daysOld}日）を評価`,
      `${report.catchCount}匹の釣果数を上限付きで加点`,
      `${report.sizeCm}cmのサイズ実績を魚種差が出すぎない範囲で加点`,
      season.reason,
      method.reason,
      `${report.areaName}エリアの岸釣り実績想定を補正`,
    ],
  };
}

export function attachCalculatedForecasts<T extends ForecastInputReport>(reports: T[], speciesList: FishSpecies[]) {
  return reports.map((report) => ({
    ...report,
    forecast: calculateForecastScore(report, speciesList),
  }));
}
