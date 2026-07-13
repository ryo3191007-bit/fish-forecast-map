export const BATHYMETRY_PRIMARY_DATASET = "gebco-2026";
export const BATHYMETRY_FALLBACK_DATASET = "etopo-2022";

export const BATHYMETRY_SOURCE_ID = "gebco-2026-dem";
export const BATHYMETRY_COLOR_SOURCE_ID = "gebco-2026-color-relief";
export const BATHYMETRY_CONTOUR_SOURCE_ID = "gebco-2026-contours";
export const BATHYMETRY_FALLBACK_SOURCE_ID = "etopo-2022-dem";
export const BATHYMETRY_FALLBACK_COLOR_SOURCE_ID = "etopo-2022-color-relief";
export const BATHYMETRY_FALLBACK_CONTOUR_SOURCE_ID = "etopo-2022-contours";
export const BATHYMETRY_COLOR_LAYER_ID = "bathymetry-color-relief";
export const BATHYMETRY_HILLSHADE_LAYER_ID = "bathymetry-hillshade";
export const BATHYMETRY_CONTOUR_LAYER_ID = "bathymetry-contours";
export const BATHYMETRY_CONTOUR_LABEL_LAYER_ID = "bathymetry-contour-labels";
export const BATHYMETRY_FALLBACK_COLOR_LAYER_ID = "bathymetry-fallback-color-relief";
export const BATHYMETRY_FALLBACK_HILLSHADE_LAYER_ID = "bathymetry-fallback-hillshade";
export const BATHYMETRY_FALLBACK_CONTOUR_LAYER_ID = "bathymetry-fallback-contours";
export const BATHYMETRY_FALLBACK_CONTOUR_LABEL_LAYER_ID = "bathymetry-fallback-contour-labels";
export const BATHYMETRY_COASTLINE_SOURCE_ID = "bathymetry-coastline";
export const BATHYMETRY_LAND_MASK_LAYER_ID = "bathymetry-land-mask";
export const BATHYMETRY_COASTLINE_LAYER_ID = "bathymetry-coastline";

export const BATHYMETRY_TILE_BASE_PATH = "/bathymetry/gebco-2026";
export const BATHYMETRY_FALLBACK_TILE_BASE_PATH = "/bathymetry/etopo-2022";
export const BATHYMETRY_TILE_URL = `${BATHYMETRY_TILE_BASE_PATH}/terrain/{z}/{x}/{y}.png`;
export const BATHYMETRY_COLOR_TILE_URL = `${BATHYMETRY_TILE_BASE_PATH}/color/{z}/{x}/{y}.png`;
export const BATHYMETRY_CONTOUR_GEOJSON_URL = `${BATHYMETRY_TILE_BASE_PATH}/contours.geojson`;
export const BATHYMETRY_METADATA_URL = `${BATHYMETRY_TILE_BASE_PATH}/metadata.json`;
export const BATHYMETRY_FALLBACK_TILE_URL = `${BATHYMETRY_FALLBACK_TILE_BASE_PATH}/terrain/{z}/{x}/{y}.png`;
export const BATHYMETRY_FALLBACK_COLOR_TILE_URL = `${BATHYMETRY_FALLBACK_TILE_BASE_PATH}/color/{z}/{x}/{y}.png`;
export const BATHYMETRY_FALLBACK_CONTOUR_GEOJSON_URL = `${BATHYMETRY_FALLBACK_TILE_BASE_PATH}/contours.geojson`;
export const BATHYMETRY_FALLBACK_METADATA_URL = `${BATHYMETRY_FALLBACK_TILE_BASE_PATH}/metadata.json`;
export const BATHYMETRY_COASTLINE_GEOJSON_URL = `${BATHYMETRY_TILE_BASE_PATH}/coastline.geojson`;
export const BATHYMETRY_LAND_MASK_OPACITY = 0.85;

export const BATHYMETRY_BOUNDS = [128.5, 32.5, 130.8, 34.0] as const;
export const BATHYMETRY_SOURCE_RESOLUTION = "15 arc-second";
export const BATHYMETRY_FALLBACK_RESOLUTION = "60 arc-second";
export const BATHYMETRY_MIN_ZOOM = 7;
export const BATHYMETRY_MAX_ZOOM = 9;

export const BATHYMETRY_ATTRIBUTION =
  "水深・地形: GEBCO_2026 Grid / GEBCO Compilation Group (2026)";
export const BATHYMETRY_FALLBACK_ATTRIBUTION =
  "水深・地形fallback: NOAA NCEI ETOPO 2022 60秒 Bedrock";
export const BATHYMETRY_LICENSE_NOTE =
  `${BATHYMETRY_SOURCE_RESOLUTION} / GEBCO Terms of Use`;
export const BATHYMETRY_FALLBACK_LICENSE_NOTE =
  `${BATHYMETRY_FALLBACK_RESOLUTION} / NOAA NCEI ETOPO 2022 / CC0-1.0`;
export const BATHYMETRY_SAFETY_NOTE =
  "参考水深。航海・安全判断には使用不可。15秒メッシュでも港内・岩礁・根・瀬の正確な位置を保証しません";
export const BATHYMETRY_CITATION =
  "Contains information from the GEBCO_2026 Grid, GEBCO Compilation Group (2026).";
export const BATHYMETRY_COASTLINE_ATTRIBUTION =
  "海岸線表示: GEBCO_2026 15秒DEMの0m境界から生成した海岸線ライン・陸地マスク。";
export const BATHYMETRY_COASTLINE_NOTE =
  "水深タイルとは独立した不透明度高めの落ち着いた緑の陸地マスクと海岸線ラインで、外部地図タイルやベージュ/オレンジ系塗りは使いません。";

export const BATHYMETRY_DEPTH_STOPS = [
  { depthMeters: 0, label: "0m", color: "#bff4ff" },
  { depthMeters: 20, label: "20m", color: "#6dd7f3" },
  { depthMeters: 50, label: "50m", color: "#2da9e1" },
  { depthMeters: 100, label: "100m", color: "#1479c9" },
  { depthMeters: 200, label: "200m", color: "#0f4f9f" },
  { depthMeters: 500, label: "500m以上", color: "#08275f" },
] as const;

export const TID_CLASSIFICATION = {
  direct: [10, 11, 12, 13, 14, 15, 16, 17],
  predictedInterpolated: [40, 41, 45],
  mixedUnknownLand: [0, 43, 44, 70, 71, 72],
  nodata: [127],
} as const;

export type TidCategory =
  | "direct"
  | "predictedInterpolated"
  | "mixedUnknownLand"
  | "nodata";
export type TidSummary = {
  direct: number;
  predictedInterpolated: number;
  mixedUnknownLand: number;
  nodata: number;
  sampleCells: number;
  radiusCells: number;
};

export function classifyTidCode(code: number): TidCategory {
  if ((TID_CLASSIFICATION.direct as readonly number[]).includes(code)) {
    return "direct";
  }
  if (
    (TID_CLASSIFICATION.predictedInterpolated as readonly number[]).includes(code)
  ) {
    return "predictedInterpolated";
  }
  if ((TID_CLASSIFICATION.nodata as readonly number[]).includes(code)) {
    return "nodata";
  }
  return "mixedUnknownLand";
}

export function lonLatToTidCell(
  lon: number,
  lat: number,
  width: number,
  height: number,
  bounds = BATHYMETRY_BOUNDS,
) {
  const [west, south, east, north] = bounds;
  if (lon < west || lon > east || lat < south || lat > north) return null;
  const longitudeCellSize = (east - west) / width;
  const latitudeCellSize = (north - south) / height;
  return {
    col: Math.max(
      0,
      Math.min(width - 1, Math.floor((lon - west) / longitudeCellSize)),
    ),
    row: Math.max(
      0,
      Math.min(height - 1, Math.floor((north - lat) / latitudeCellSize)),
    ),
  };
}

export function summarizeTidAround(
  values: number[],
  width: number,
  height: number,
  col: number,
  row: number,
  radiusCells = 8,
): TidSummary {
  const counts = {
    direct: 0,
    predictedInterpolated: 0,
    mixedUnknownLand: 0,
    nodata: 0,
  };
  for (
    let y = Math.max(0, row - radiusCells);
    y <= Math.min(height - 1, row + radiusCells);
    y++
  ) {
    for (
      let x = Math.max(0, col - radiusCells);
      x <= Math.min(width - 1, col + radiusCells);
      x++
    ) {
      counts[classifyTidCode(values[y * width + x])]++;
    }
  }
  const total =
    counts.direct + counts.predictedInterpolated + counts.mixedUnknownLand;
  if (!total) {
    return {
      direct: 0,
      predictedInterpolated: 0,
      mixedUnknownLand: 0,
      nodata: counts.nodata,
      sampleCells: 0,
      radiusCells,
    };
  }
  const direct = Math.round((counts.direct / total) * 100);
  const predictedInterpolated = Math.round(
    (counts.predictedInterpolated / total) * 100,
  );
  return {
    direct,
    predictedInterpolated,
    mixedUnknownLand: Math.max(0, 100 - direct - predictedInterpolated),
    nodata: counts.nodata,
    sampleCells: total,
    radiusCells,
  };
}

export type DeviceCapabilityInput = {
  width: number;
  prefersReducedMotion: boolean;
  deviceMemory?: number;
  webglAvailable: boolean;
};
export function shouldEnableInitialTerrain(input: DeviceCapabilityInput) {
  return (
    input.webglAvailable &&
    input.width >= 720 &&
    !input.prefersReducedMotion &&
    (input.deviceMemory ?? 4) >= 4
  );
}
export function shouldEnableInitialCoastlineOverlay(width: number) {
  return width >= 640;
}
export function formatDepthLabel(elevationMeters: number) {
  return `${Math.abs(Math.round(elevationMeters))}m`;
}
export function bathymetryVisibility(
  mode: "standard" | "aerial" | "bathymetry",
  terrainEnabled: boolean,
) {
  return {
    showBathymetry: mode === "bathymetry",
    terrain: mode === "bathymetry" && terrainEnabled,
  };
}
