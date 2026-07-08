import type { FishSpecies, FishingReport } from "@/domain/fishing";
import { attachCalculatedForecasts } from "@/domain/forecastScore";
import { fishSpeciesNames } from "@/domain/fishing";

export const fishSpecies: FishSpecies[] = fishSpeciesNames.map((nameJa) => ({
  id: nameJa,
  nameJa,
  category: nameJa.includes("イカ") ? "squid" : nameJa === "青物" || nameJa === "根魚" ? "category" : "fish",
  seasonMonths: [5, 6, 7, 8, 9, 10],
}));

const mockSource = {
  sourceName: "MVPモックデータ",
  sourceUrl: "https://github.com/ryo3191007-bit/fish-forecast-map/blob/main/docs/DATA_POLICY.md",
};

const mockFishingReportInputs: Omit<FishingReport, "forecast">[] = [
  { id: "nokita-aj", reportDate: "2026-06-22", species: "アジ", spotName: "野北漁港周辺", areaName: "糸島西岸", latitude: 33.623, longitude: 130.138, catchCount: 18, sizeCm: 24, method: "サビキ", ...mockSource },
  { id: "keya-aori", reportDate: "2026-06-20", species: "アオリイカ", spotName: "芥屋周辺", areaName: "糸島西岸", latitude: 33.596, longitude: 130.109, catchCount: 2, sizeCm: 28, method: "エギング", ...mockSource },
  { id: "shimano-seabass", reportDate: "2026-06-18", species: "シーバス", spotName: "志摩野北周辺", areaName: "糸島西岸", latitude: 33.625, longitude: 130.158, catchCount: 1, sizeCm: 62, method: "キャスティング", ...mockSource },
  { id: "futamigaura-chinu", reportDate: "2026-06-19", species: "チヌ", spotName: "二見ヶ浦周辺", areaName: "糸島西岸", latitude: 33.608, longitude: 130.181, catchCount: 2, sizeCm: 42, method: "コマセ", ...mockSource },
  { id: "keya-kouika", reportDate: "2026-06-25", species: "コウイカ", spotName: "芥屋漁港周辺", areaName: "糸島西岸", latitude: 33.594, longitude: 130.112, catchCount: 3, sizeCm: 18, method: "エギング", ...mockSource },
  { id: "nogita-iwashi", reportDate: "2026-06-26", species: "イワシ", spotName: "野北漁港外側", areaName: "糸島西岸", latitude: 33.626, longitude: 130.134, catchCount: 35, sizeCm: 14, method: "サビキ", ...mockSource },
  { id: "karatsu-blue", reportDate: "2026-06-24", species: "青物", spotName: "唐津東港周辺", areaName: "唐津湾", latitude: 33.455, longitude: 129.985, catchCount: 3, sizeCm: 45, method: "ジギング", ...mockSource },
  { id: "karatsu-kisu", reportDate: "2026-06-23", species: "キス", spotName: "唐津湾周辺", areaName: "唐津湾", latitude: 33.462, longitude: 130.016, catchCount: 12, sizeCm: 19, method: "その他", ...mockSource },
  { id: "niji-matsubara-flat", reportDate: "2026-06-16", species: "マゴチ", spotName: "虹の松原サーフ", areaName: "唐津湾", latitude: 33.447, longitude: 130.039, catchCount: 1, sizeCm: 48, method: "キャスティング", ...mockSource },
  { id: "minato-saba", reportDate: "2026-06-27", species: "サバ", spotName: "唐津港湾部", areaName: "唐津湾", latitude: 33.468, longitude: 129.978, catchCount: 16, sizeCm: 25, method: "サビキ", ...mockSource },
  { id: "higashi-madai", reportDate: "2026-06-14", species: "真鯛", spotName: "唐津東港外向き", areaName: "唐津湾", latitude: 33.459, longitude: 129.993, catchCount: 1, sizeCm: 38, method: "コマセ", ...mockSource },
  { id: "yobuko-rock", reportDate: "2026-06-21", species: "根魚", spotName: "呼子周辺", areaName: "唐津湾北部", latitude: 33.540, longitude: 129.895, catchCount: 6, sizeCm: 26, method: "その他", ...mockSource },
  { id: "yobuko-yariika", reportDate: "2026-06-12", species: "ヤリイカ", spotName: "呼子港周辺", areaName: "唐津湾北部", latitude: 33.543, longitude: 129.892, catchCount: 4, sizeCm: 24, method: "エギング", ...mockSource },
  { id: "hizen-blue", reportDate: "2026-06-28", species: "青物", spotName: "肥前町岸壁周辺", areaName: "唐津湾西部", latitude: 33.448, longitude: 129.844, catchCount: 2, sizeCm: 50, method: "ジギング", ...mockSource },
  { id: "imari-flat", reportDate: "2026-06-17", species: "ヒラメ", spotName: "伊万里湾周辺", areaName: "伊万里湾", latitude: 33.296, longitude: 129.819, catchCount: 1, sizeCm: 52, method: "泳がせ", ...mockSource },
  { id: "imari-aj", reportDate: "2026-06-24", species: "アジ", spotName: "伊万里湾奥港湾部", areaName: "伊万里湾", latitude: 33.281, longitude: 129.861, catchCount: 22, sizeCm: 21, method: "サビキ", ...mockSource },
  { id: "imari-aori", reportDate: "2026-06-11", species: "アオリイカ", spotName: "伊万里湾口地磯", areaName: "伊万里湾", latitude: 33.332, longitude: 129.773, catchCount: 1, sizeCm: 30, method: "エギング", ...mockSource },
  { id: "imari-seabass", reportDate: "2026-06-13", species: "シーバス", spotName: "伊万里湾河口部", areaName: "伊万里湾", latitude: 33.285, longitude: 129.843, catchCount: 2, sizeCm: 58, method: "キャスティング", ...mockSource },
  { id: "imari-chinu", reportDate: "2026-06-18", species: "チヌ", spotName: "伊万里湾護岸", areaName: "伊万里湾", latitude: 33.303, longitude: 129.828, catchCount: 3, sizeCm: 36, method: "コマセ", ...mockSource },
  { id: "hirado-madai", reportDate: "2026-06-15", species: "真鯛", spotName: "平戸方面", areaName: "平戸", latitude: 33.365, longitude: 129.553, catchCount: 2, sizeCm: 40, method: "コマセ", ...mockSource },
  { id: "hirado-shiira", reportDate: "2026-06-29", species: "シイラ", spotName: "平戸北部岸壁", areaName: "平戸", latitude: 33.390, longitude: 129.564, catchCount: 1, sizeCm: 70, method: "キャスティング", ...mockSource },
  { id: "hirado-rock", reportDate: "2026-06-20", species: "根魚", spotName: "平戸地磯周辺", areaName: "平戸", latitude: 33.354, longitude: 129.579, catchCount: 5, sizeCm: 28, method: "その他", ...mockSource },
  { id: "hirado-aori", reportDate: "2026-06-22", species: "アオリイカ", spotName: "平戸南部漁港", areaName: "平戸", latitude: 33.296, longitude: 129.488, catchCount: 2, sizeCm: 27, method: "エギング", ...mockSource },
  { id: "hirado-kisu", reportDate: "2026-06-19", species: "キス", spotName: "平戸南部サーフ", areaName: "平戸", latitude: 33.287, longitude: 129.497, catchCount: 9, sizeCm: 20, method: "その他", ...mockSource },
];

export const mockFishingReports: FishingReport[] = attachCalculatedForecasts(mockFishingReportInputs, fishSpecies);
