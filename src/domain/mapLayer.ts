export type MapLayerMode = "standard" | "aerial" | "bathymetry";

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
  {
    id: "bathymetry",
    label: "水深・3D地形",
    description: "GEBCO_2026 15秒を第一source、ETOPO 2022 60秒をfallbackにした参考水深色分け・等深線・MapLibre terrain",
  },
];

export const GSI_AERIAL_TILE_ATTRIBUTION =
  "出典: 国土地理院ウェブサイト / 地理院タイル（標準地図・衛星モザイク画像・全国ランドサットモザイク画像・全国最新写真）。標準地図の海域部にはGEBCO Digital Atlas由来等深線、海上保安庁許可第292502号の海底地形、VMAP0 shoreline等を含みます。";

export const GSI_AERIAL_TILE_NOTE =
  "低倍率では衛星モザイク画像、中〜高倍率ではランドサット/全国最新写真を表示します。GSI overlay OFF時はこれら追加出典を表示せず、GEBCO正本の出典とは分けて表示します。";
