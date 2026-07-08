import type { FishSpecies, FishingReport } from "@/domain/fishing";
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

export const mockFishingReports: FishingReport[] = [
  { id: "nokita-aj", reportDate: "2026-06-22", species: "アジ", spotName: "野北漁港周辺", areaName: "糸島西岸", latitude: 33.623, longitude: 130.138, catchCount: 18, sizeCm: 24, method: "サビキ", ...mockSource, forecast: { score: 78, reasons: ["朝夕の回遊を想定", "同エリアの小型青物ベイト接岸を仮定", "足場の良い漁港で再現性が高い"] } },
  { id: "keya-aori", reportDate: "2026-06-20", species: "アオリイカ", spotName: "芥屋周辺", areaName: "糸島西岸", latitude: 33.596, longitude: 130.109, catchCount: 2, sizeCm: 28, method: "エギング", ...mockSource, forecast: { score: 64, reasons: ["藻場と岩礁帯を想定", "春から初夏の親イカシーズン", "風向き次第で釣り座が限られる"] } },
  { id: "shimano-seabass", reportDate: "2026-06-18", species: "シーバス", spotName: "志摩野北周辺", areaName: "糸島西岸", latitude: 33.625, longitude: 130.158, catchCount: 1, sizeCm: 62, method: "キャスティング", ...mockSource, forecast: { score: 59, reasons: ["サーフと河口の地形変化を想定", "薄暗い時間帯の反応を想定", "波が高い日は安全確認が必要"] } },
  { id: "futamigaura-chinu", reportDate: "2026-06-19", species: "チヌ", spotName: "二見ヶ浦周辺", areaName: "糸島西岸", latitude: 33.608, longitude: 130.181, catchCount: 2, sizeCm: 42, method: "コマセ", ...mockSource, forecast: { score: 61, reasons: ["岩礁と砂地の境目を想定", "濁りが入る日は反応が出やすい想定", "観光地に近いため時間帯選びが必要"] } },
  { id: "keya-kouika", reportDate: "2026-06-25", species: "コウイカ", spotName: "芥屋漁港周辺", areaName: "糸島西岸", latitude: 33.594, longitude: 130.112, catchCount: 3, sizeCm: 18, method: "エギング", ...mockSource, forecast: { score: 63, reasons: ["砂泥底の港内を想定", "底付近を丁寧に探る条件", "風裏になれば初心者でも確認しやすい"] } },
  { id: "nogita-iwashi", reportDate: "2026-06-26", species: "イワシ", spotName: "野北漁港外側", areaName: "糸島西岸", latitude: 33.626, longitude: 130.134, catchCount: 35, sizeCm: 14, method: "サビキ", ...mockSource, forecast: { score: 75, reasons: ["小型回遊魚の接岸を想定", "ファミリー向けの足場を仮定", "群れの有無で釣果差が大きい"] } },
  { id: "karatsu-blue", reportDate: "2026-06-24", species: "青物", spotName: "唐津東港周辺", areaName: "唐津湾", latitude: 33.455, longitude: 129.985, catchCount: 3, sizeCm: 45, method: "ジギング", ...mockSource, forecast: { score: 72, reasons: ["潮通しの良い岸壁を想定", "ベイトの回遊があれば期待", "朝まずめの短時間勝負向き"] } },
  { id: "karatsu-kisu", reportDate: "2026-06-23", species: "キス", spotName: "唐津湾周辺", areaName: "唐津湾", latitude: 33.462, longitude: 130.016, catchCount: 12, sizeCm: 19, method: "その他", ...mockSource, forecast: { score: 74, reasons: ["砂浜エリアの初夏パターン", "数釣りを狙いやすい季節", "荒天後は濁りに注意"] } },
  { id: "niji-matsubara-flat", reportDate: "2026-06-16", species: "マゴチ", spotName: "虹の松原サーフ", areaName: "唐津湾", latitude: 33.447, longitude: 130.039, catchCount: 1, sizeCm: 48, method: "キャスティング", ...mockSource, forecast: { score: 58, reasons: ["遠浅サーフの地形変化を想定", "日中でもボトム狙いで可能性あり", "広く歩いて探る前提"] } },
  { id: "minato-saba", reportDate: "2026-06-27", species: "サバ", spotName: "唐津港湾部", areaName: "唐津湾", latitude: 33.468, longitude: 129.978, catchCount: 16, sizeCm: 25, method: "サビキ", ...mockSource, forecast: { score: 70, reasons: ["常夜灯周りの小型回遊を想定", "アジと混じる群れを仮定", "時間帯でムラが出やすい"] } },
  { id: "higashi-madai", reportDate: "2026-06-14", species: "真鯛", spotName: "唐津東港外向き", areaName: "唐津湾", latitude: 33.459, longitude: 129.993, catchCount: 1, sizeCm: 38, method: "コマセ", ...mockSource, forecast: { score: 57, reasons: ["潮が動く時間帯の回遊を想定", "岸壁から届く範囲の反応を仮定", "大釣りより単発狙い"] } },
  { id: "yobuko-rock", reportDate: "2026-06-21", species: "根魚", spotName: "呼子周辺", areaName: "唐津湾北部", latitude: 33.540, longitude: 129.895, catchCount: 6, sizeCm: 26, method: "その他", ...mockSource, forecast: { score: 69, reasons: ["岩礁帯と常夜灯周りを想定", "根魚カテゴリとして広めに評価", "根掛かり対策が必要"] } },
  { id: "yobuko-yariika", reportDate: "2026-06-12", species: "ヤリイカ", spotName: "呼子港周辺", areaName: "唐津湾北部", latitude: 33.543, longitude: 129.892, catchCount: 4, sizeCm: 24, method: "エギング", ...mockSource, forecast: { score: 55, reasons: ["夜間の常夜灯周りを想定", "季節終盤寄りのため控えめ評価", "群れが入れば短時間で反応する想定"] } },
  { id: "hizen-blue", reportDate: "2026-06-28", species: "青物", spotName: "肥前町岸壁周辺", areaName: "唐津湾西部", latitude: 33.448, longitude: 129.844, catchCount: 2, sizeCm: 50, method: "ジギング", ...mockSource, forecast: { score: 67, reasons: ["湾口寄りの潮通しを想定", "ベイト次第で回遊が入る想定", "足場の安全確認を優先"] } },
  { id: "imari-flat", reportDate: "2026-06-17", species: "ヒラメ", spotName: "伊万里湾周辺", areaName: "伊万里湾", latitude: 33.296, longitude: 129.819, catchCount: 1, sizeCm: 52, method: "泳がせ", ...mockSource, forecast: { score: 56, reasons: ["砂地と港湾部の境目を想定", "ベイト接岸時にチャンス", "広範囲の探りが必要"] } },
  { id: "imari-aj", reportDate: "2026-06-24", species: "アジ", spotName: "伊万里湾奥港湾部", areaName: "伊万里湾", latitude: 33.281, longitude: 129.861, catchCount: 22, sizeCm: 21, method: "サビキ", ...mockSource, forecast: { score: 73, reasons: ["湾奥の常夜灯周りを想定", "小型ベイトの寄りを仮定", "夕まずめから夜に確認しやすい"] } },
  { id: "imari-aori", reportDate: "2026-06-11", species: "アオリイカ", spotName: "伊万里湾口地磯", areaName: "伊万里湾", latitude: 33.332, longitude: 129.773, catchCount: 1, sizeCm: 30, method: "エギング", ...mockSource, forecast: { score: 62, reasons: ["藻場が絡む地磯を想定", "大型は単発になりやすい想定", "うねりがある日は無理をしない前提"] } },
  { id: "imari-seabass", reportDate: "2026-06-13", species: "シーバス", spotName: "伊万里湾河口部", areaName: "伊万里湾", latitude: 33.285, longitude: 129.843, catchCount: 2, sizeCm: 58, method: "キャスティング", ...mockSource, forecast: { score: 60, reasons: ["河口の流れ込みを想定", "雨後の濁りで活性が上がる仮定", "足元の安全と立入範囲に注意"] } },
  { id: "imari-chinu", reportDate: "2026-06-18", species: "チヌ", spotName: "伊万里湾護岸", areaName: "伊万里湾", latitude: 33.303, longitude: 129.828, catchCount: 3, sizeCm: 36, method: "コマセ", ...mockSource, forecast: { score: 65, reasons: ["護岸際の変化を想定", "濁りと潮位の上げを評価", "足場は良いが混雑を避けたい"] } },
  { id: "hirado-madai", reportDate: "2026-06-15", species: "真鯛", spotName: "平戸方面", areaName: "平戸", latitude: 33.365, longitude: 129.553, catchCount: 2, sizeCm: 40, method: "コマセ", ...mockSource, forecast: { score: 66, reasons: ["潮通しの良い瀬周りを想定", "初夏の回遊を仮定", "足場と安全確認を優先"] } },
  { id: "hirado-shiira", reportDate: "2026-06-29", species: "シイラ", spotName: "平戸北部岸壁", areaName: "平戸", latitude: 33.390, longitude: 129.564, catchCount: 1, sizeCm: 70, method: "キャスティング", ...mockSource, forecast: { score: 54, reasons: ["夏の回遊初期を想定", "潮目や浮遊物があれば期待", "回遊待ち要素が強いため控えめ評価"] } },
  { id: "hirado-rock", reportDate: "2026-06-20", species: "根魚", spotName: "平戸地磯周辺", areaName: "平戸", latitude: 33.354, longitude: 129.579, catchCount: 5, sizeCm: 28, method: "その他", ...mockSource, forecast: { score: 68, reasons: ["岩礁帯の穴撃ちを想定", "朝夕のローライトを評価", "安全装備と撤退判断が前提"] } },
  { id: "hirado-aori", reportDate: "2026-06-22", species: "アオリイカ", spotName: "平戸南部漁港", areaName: "平戸", latitude: 33.296, longitude: 129.488, catchCount: 2, sizeCm: 27, method: "エギング", ...mockSource, forecast: { score: 64, reasons: ["港内外の藻場を想定", "朝まずめの回遊を仮定", "墨跡など実データは使わないモック評価"] } },
  { id: "hirado-kisu", reportDate: "2026-06-19", species: "キス", spotName: "平戸南部サーフ", areaName: "平戸", latitude: 33.287, longitude: 129.497, catchCount: 9, sizeCm: 20, method: "その他", ...mockSource, forecast: { score: 71, reasons: ["砂浜の近距離戦を想定", "初夏の数釣りシーズンを評価", "濁りが強い日は反応低下を想定"] } },
];
