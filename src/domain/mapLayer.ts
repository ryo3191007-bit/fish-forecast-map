export type MapLayerMode = "standard" | "aerial";

export type MapLayerOption = {
  id: MapLayerMode;
  label: string;
  description: string;
};

export const mapLayerOptions: MapLayerOption[] = [
  {
    id: "standard",
    label: "通常地図",
    description: "MapLibreデモタイルの通常地図",
  },
  {
    id: "aerial",
    label: "航空写真",
    description: "国土地理院の衛星モザイク・ランドサット・全国最新写真",
  },
];

export const GSI_AERIAL_TILE_ATTRIBUTION =
  "出典: 国土地理院ウェブサイト / 地理院タイル";

export const GSI_AERIAL_TILE_NOTE =
  "低倍率では衛星モザイク画像、中〜高倍率ではランドサット/全国最新写真を表示します。";
