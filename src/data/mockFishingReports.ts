import type { FishSpecies, FishingReport } from "@/domain/fishing";
import { fishSpeciesNames } from "@/domain/fishing";

export const fishSpecies: FishSpecies[] = fishSpeciesNames.map((nameJa) => ({
  id: nameJa,
  nameJa,
  category: nameJa.includes("イカ") ? "squid" : nameJa === "青物" || nameJa === "根魚" ? "category" : "fish",
  seasonMonths: [5, 6, 7, 8, 9, 10],
}));

export const mockFishingReports: FishingReport[] = [
  { id: "nokita-aj", reportDate: "2026-06-22", species: "アジ", spotName: "野北漁港周辺", areaName: "糸島西岸", latitude: 33.623, longitude: 130.138, catchCount: 18, sizeCm: 24, method: "サビキ", sourceName: "MVPモックデータ", sourceUrl: "https://example.com/mock/nokita-aj", forecast: { score: 78, reasons: ["朝夕の回遊を想定", "同エリアの小型青物ベイト接岸を仮定", "足場の良い漁港で再現性が高い"] } },
  { id: "keya-aori", reportDate: "2026-06-20", species: "アオリイカ", spotName: "芥屋周辺", areaName: "糸島西岸", latitude: 33.596, longitude: 130.109, catchCount: 2, sizeCm: 28, method: "エギング", sourceName: "MVPモックデータ", sourceUrl: "https://example.com/mock/keya-aori", forecast: { score: 64, reasons: ["藻場と岩礁帯を想定", "春から初夏の親イカシーズン", "風向き次第で釣り座が限られる"] } },
  { id: "shimano-seabass", reportDate: "2026-06-18", species: "シーバス", spotName: "志摩野北周辺", areaName: "糸島西岸", latitude: 33.625, longitude: 130.158, catchCount: 1, sizeCm: 62, method: "キャスティング", sourceName: "MVPモックデータ", sourceUrl: "https://example.com/mock/shimano-seabass", forecast: { score: 59, reasons: ["サーフと河口の地形変化を想定", "薄暗い時間帯の反応を想定", "波が高い日は安全確認が必要"] } },
  { id: "karatsu-blue", reportDate: "2026-06-24", species: "青物", spotName: "唐津東港周辺", areaName: "唐津湾", latitude: 33.455, longitude: 129.985, catchCount: 3, sizeCm: 45, method: "ジギング", sourceName: "MVPモックデータ", sourceUrl: "https://example.com/mock/karatsu-blue", forecast: { score: 72, reasons: ["潮通しの良い岸壁を想定", "ベイトの回遊があれば期待", "朝まずめの短時間勝負向き"] } },
  { id: "yobuko-rock", reportDate: "2026-06-21", species: "根魚", spotName: "呼子周辺", areaName: "唐津湾北部", latitude: 33.540, longitude: 129.895, catchCount: 6, sizeCm: 26, method: "その他", sourceName: "MVPモックデータ", sourceUrl: "https://example.com/mock/yobuko-rock", forecast: { score: 69, reasons: ["岩礁帯と常夜灯周りを想定", "根魚カテゴリとして広めに評価", "根掛かり対策が必要"] } },
  { id: "imari-flat", reportDate: "2026-06-17", species: "ヒラメ", spotName: "伊万里湾周辺", areaName: "伊万里湾", latitude: 33.296, longitude: 129.819, catchCount: 1, sizeCm: 52, method: "泳がせ", sourceName: "MVPモックデータ", sourceUrl: "https://example.com/mock/imari-flat", forecast: { score: 56, reasons: ["砂地と港湾部の境目を想定", "ベイト接岸時にチャンス", "広範囲の探りが必要"] } },
  { id: "hirado-madai", reportDate: "2026-06-15", species: "真鯛", spotName: "平戸方面", areaName: "平戸", latitude: 33.365, longitude: 129.553, catchCount: 2, sizeCm: 40, method: "コマセ", sourceName: "MVPモックデータ", sourceUrl: "https://example.com/mock/hirado-madai", forecast: { score: 66, reasons: ["潮通しの良い瀬周りを想定", "初夏の回遊を仮定", "足場と安全確認を優先"] } },
  { id: "karatsu-kisu", reportDate: "2026-06-23", species: "キス", spotName: "唐津湾周辺", areaName: "唐津湾", latitude: 33.462, longitude: 130.016, catchCount: 12, sizeCm: 19, method: "その他", sourceName: "MVPモックデータ", sourceUrl: "https://example.com/mock/karatsu-kisu", forecast: { score: 74, reasons: ["砂浜エリアの初夏パターン", "数釣りを狙いやすい季節", "荒天後は濁りに注意"] } },
];
