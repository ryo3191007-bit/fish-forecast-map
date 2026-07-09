export type MapLayerMode = "standard" | "aerial";

export type MapLayerOption = {
  id: MapLayerMode;
  label: string;
  description: string;
};

export const mapLayerOptions: MapLayerOption[] = [
  { id: "standard", label: "通常地図", description: "MapLibreデモタイルの通常地図" },
  { id: "aerial", label: "航空写真", description: "国土地理院の全国最新写真（シームレス）" },
];

export const GSI_SEAMLESS_PHOTO_ATTRIBUTION = "出典: 国土地理院ウェブサイト / 地理院タイル";
