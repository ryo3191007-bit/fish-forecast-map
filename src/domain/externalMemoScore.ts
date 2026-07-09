import { fishSpeciesNames, type FishingReport } from "@/domain/fishing";
import type { ExternalCatchMemo } from "@/lib/externalCatchMemoStorage";

const EXTERNAL_MEMO_SCORE_CAP = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isKnownSpecies = (species: string): species is FishingReport["species"] => {
  return fishSpeciesNames.includes(species as FishingReport["species"]);
};

const toDateOnlyString = (date = new Date()) => date.toISOString().slice(0, 10);

const daysBetween = (fromDate: string, toDate: string) => {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.POSITIVE_INFINITY;
  if (from > to) return Number.POSITIVE_INFINITY;
  return Math.floor((to - from) / MS_PER_DAY);
};

const getFreshnessPoints = (caughtDate: string, referenceDate: string) => {
  const daysOld = daysBetween(caughtDate, referenceDate);
  if (daysOld <= 7) return { points: 3, label: "直近7日以内" };
  if (daysOld <= 14) return { points: 2, label: "直近14日以内" };
  if (daysOld <= 30) return { points: 1, label: "直近30日以内" };
  return { points: 0, label: "30日超" };
};

const getMemoContribution = (report: FishingReport, memo: ExternalCatchMemo, referenceDate: string) => {
  if (memo.acquisitionMethod !== "manual") return 0;
  if (memo.confidence === "low") return 0;
  if (!memo.caughtDate || !isKnownSpecies(String(memo.species)) || memo.species !== report.species) return 0;

  const spotMatches = memo.spotId === report.spotId;
  const areaMatches = memo.areaName === report.areaName;
  if (!spotMatches && !areaMatches) return 0;

  const freshness = getFreshnessPoints(memo.caughtDate, referenceDate);
  if (freshness.points === 0) return 0;

  const locationPoints = spotMatches ? 4 : 2;
  const confidencePoints = memo.confidence === "high" ? 3 : 2;
  const methodPoints = memo.method && memo.method === report.method ? 1 : 0;
  const catchDetailPoints = (memo.catchCount && memo.catchCount > 1) || memo.sizeCm ? 1 : 0;

  return locationPoints + confidencePoints + freshness.points + methodPoints + catchDetailPoints;
};

export function applyExternalMemoScoreAdjustments(
  reports: FishingReport[],
  memos: ExternalCatchMemo[],
  referenceDate = toDateOnlyString(),
): FishingReport[] {
  return reports.map((report) => {
    const rawAdjustment = memos.reduce((total, memo) => total + getMemoContribution(report, memo, referenceDate), 0);
    const adjustment = Math.min(rawAdjustment, EXTERNAL_MEMO_SCORE_CAP);
    if (adjustment <= 0) return report;

    const matchingMemos = memos.filter((memo) => getMemoContribution(report, memo, referenceDate) > 0);
    const hasSpotMatch = matchingMemos.some((memo) => memo.spotId === report.spotId);
    const hasMethodMatch = matchingMemos.some((memo) => memo.method === report.method);
    const strongestConfidence = matchingMemos.some((memo) => memo.confidence === "high") ? "high" : "medium";
    const freshestMemo = [...matchingMemos].sort((a, b) => Date.parse(b.caughtDate) - Date.parse(a.caughtDate))[0];
    const freshness = freshestMemo ? getFreshnessPoints(freshestMemo.caughtDate, referenceDate) : undefined;

    return {
      ...report,
      forecast: {
        score: Math.min(100, report.forecast.score + adjustment),
        reasons: [
          ...report.forecast.reasons,
          `手動登録された外部釣果メモに同魚種・${hasSpotMatch ? "同じ釣り場" : "同エリア"}の${freshness?.label ?? "直近"}情報があります。`,
          `外部メモの信頼度(${strongestConfidence})${hasMethodMatch ? "と同じ釣り方" : ""}を参考に、上限${EXTERNAL_MEMO_SCORE_CAP}点内で+${adjustment}点補正しています。`,
          "外部メモ由来の加点は参考情報であり、釣果を保証しません。",
        ],
      },
    };
  });
}
