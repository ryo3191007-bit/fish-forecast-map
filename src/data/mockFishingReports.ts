import { createStaticFishSpecies, type FishSpecies, type FishingReport } from "@/domain/fishing";
import { attachCalculatedForecasts } from "@/domain/forecastScore";
import { fishingSpotById } from "@/data/fishingSpots";

export const fishSpecies: FishSpecies[] = createStaticFishSpecies().map((species) => ({ ...species, seasonMonths: [5, 6, 7, 8, 9, 10] }));

const mockSource = {
  sourceName: "MVPモックデータ",
  sourceUrl: "https://github.com/ryo3191007-bit/fish-forecast-map/blob/main/docs/DATA_POLICY.md",
};


const reportAtSpot = (
  spotId: string,
  report: Omit<FishingReport, "forecast" | "spotId" | "spotName" | "areaName" | "latitude" | "longitude">,
): Omit<FishingReport, "forecast"> => {
  const spot = fishingSpotById.get(spotId);
  if (!spot) throw new Error(`Unknown fishing spot: ${spotId}`);

  return {
    ...report,
    spotId,
    spotName: spot.name,
    areaName: spot.areaName,
    latitude: spot.latitude,
    longitude: spot.longitude,
  };
};

const mockFishingReportInputs: Omit<FishingReport, "forecast">[] = [
  reportAtSpot("nokita-port", { id: "nokita-aj", reportDate: "2026-06-22", species: "アジ", catchCount: 18, sizeCm: 24, method: "サビキ", ...mockSource }),
  reportAtSpot("keya-gate", { id: "keya-aori", reportDate: "2026-06-20", species: "アオリイカ", catchCount: 2, sizeCm: 28, method: "エギング", ...mockSource }),
  reportAtSpot("nokita-beach", { id: "shimano-seabass", reportDate: "2026-06-18", species: "スズキ", catchCount: 1, sizeCm: 62, method: "キャスティング", ...mockSource }),
  reportAtSpot("funakoshi-port", { id: "futamigaura-chinu", reportDate: "2026-06-19", species: "チヌ", catchCount: 2, sizeCm: 42, method: "コマセ", ...mockSource }),
  reportAtSpot("keya-port", { id: "keya-kouika", reportDate: "2026-06-25", species: "コウイカ", catchCount: 3, sizeCm: 18, method: "エギング", ...mockSource }),
  reportAtSpot("nokita-port", { id: "nogita-iwashi", reportDate: "2026-06-26", species: "イワシ", catchCount: 35, sizeCm: 14, method: "サビキ", ...mockSource }),
  reportAtSpot("karatsu-east-port", { id: "karatsu-blue", reportDate: "2026-06-24", species: "青物", catchCount: 3, sizeCm: 45, method: "ジギング", ...mockSource }),
  reportAtSpot("niji-matsubara", { id: "karatsu-kisu", reportDate: "2026-06-23", species: "キス", catchCount: 12, sizeCm: 19, method: "その他", ...mockSource }),
  reportAtSpot("hamasaki-beach", { id: "niji-matsubara-flat", reportDate: "2026-06-16", species: "マゴチ", catchCount: 1, sizeCm: 48, method: "キャスティング", ...mockSource }),
  reportAtSpot("karatsu-west-port", { id: "minato-saba", reportDate: "2026-06-27", species: "サバ", catchCount: 16, sizeCm: 25, method: "サビキ", ...mockSource }),
  reportAtSpot("karatsu-east-port", { id: "higashi-madai", reportDate: "2026-06-14", species: "真鯛", catchCount: 1, sizeCm: 38, method: "コマセ", ...mockSource }),
  reportAtSpot("yobuko-area", { id: "yobuko-rock", reportDate: "2026-06-21", species: "根魚", catchCount: 6, sizeCm: 26, method: "その他", ...mockSource }),
  reportAtSpot("yobuko-area", { id: "yobuko-yariika", reportDate: "2026-06-12", species: "ヤリイカ", catchCount: 4, sizeCm: 24, method: "エギング", ...mockSource }),
  reportAtSpot("takashima-area", { id: "hizen-blue", reportDate: "2026-06-28", species: "青物", catchCount: 2, sizeCm: 50, method: "ジギング", ...mockSource }),
  reportAtSpot("imari-inner-bay", { id: "imari-flat", reportDate: "2026-06-17", species: "ヒラメ", catchCount: 1, sizeCm: 52, method: "泳がせ", ...mockSource }),
  reportAtSpot("imari-inner-bay", { id: "imari-aj", reportDate: "2026-06-24", species: "アジ", catchCount: 22, sizeCm: 21, method: "サビキ", ...mockSource }),
  reportAtSpot("fukushima-area", { id: "imari-aori", reportDate: "2026-06-11", species: "アオリイカ", catchCount: 1, sizeCm: 30, method: "エギング", ...mockSource }),
  reportAtSpot("imari-inner-bay", { id: "imari-seabass", reportDate: "2026-06-13", species: "スズキ", catchCount: 2, sizeCm: 58, method: "キャスティング", ...mockSource }),
  reportAtSpot("imari-inner-bay", { id: "imari-chinu", reportDate: "2026-06-18", species: "チヌ", catchCount: 3, sizeCm: 36, method: "コマセ", ...mockSource }),
  reportAtSpot("tabira-port", { id: "hirado-madai", reportDate: "2026-06-15", species: "真鯛", catchCount: 2, sizeCm: 40, method: "コマセ", ...mockSource }),
  reportAtSpot("ikitsuki-area", { id: "hirado-shiira", reportDate: "2026-06-29", species: "シイラ", catchCount: 1, sizeCm: 70, method: "キャスティング", ...mockSource }),
  reportAtSpot("hirado-seto", { id: "hirado-rock", reportDate: "2026-06-20", species: "根魚", catchCount: 5, sizeCm: 28, method: "その他", ...mockSource }),
  reportAtSpot("hirado-seto", { id: "hirado-aori", reportDate: "2026-06-22", species: "アオリイカ", catchCount: 2, sizeCm: 27, method: "エギング", ...mockSource }),
  reportAtSpot("hirado-seto", { id: "hirado-kisu", reportDate: "2026-06-19", species: "キス", catchCount: 9, sizeCm: 20, method: "その他", ...mockSource }),
];

export const mockFishingReports: FishingReport[] = attachCalculatedForecasts(mockFishingReportInputs, fishSpecies);
