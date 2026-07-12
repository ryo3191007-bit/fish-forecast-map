export const GEBCO_BATHYMETRY_SOURCE_ID = "gebco-2026-dem";
export const GEBCO_BATHYMETRY_COLOR_SOURCE_ID = "gebco-2026-color-relief";
export const GEBCO_BATHYMETRY_CONTOUR_SOURCE_ID = "gebco-2026-contours";
export const ETOPO_BATHYMETRY_SOURCE_ID = "etopo-2022-dem";
export const ETOPO_BATHYMETRY_COLOR_SOURCE_ID = "etopo-2022-color-relief";
export const ETOPO_BATHYMETRY_CONTOUR_SOURCE_ID = "etopo-2022-contours";
export const BATHYMETRY_SOURCE_ID = GEBCO_BATHYMETRY_SOURCE_ID;
export const BATHYMETRY_COLOR_SOURCE_ID = GEBCO_BATHYMETRY_COLOR_SOURCE_ID;
export const BATHYMETRY_CONTOUR_SOURCE_ID = GEBCO_BATHYMETRY_CONTOUR_SOURCE_ID;
export const BATHYMETRY_COLOR_LAYER_ID = "bathymetry-color-relief";
export const BATHYMETRY_HILLSHADE_LAYER_ID = "bathymetry-hillshade";
export const BATHYMETRY_CONTOUR_LAYER_ID = "bathymetry-contours";
export const BATHYMETRY_CONTOUR_LABEL_LAYER_ID = "bathymetry-contour-labels";

export const GEBCO_BATHYMETRY_TILE_BASE_PATH = "/bathymetry/gebco-2026";
export const ETOPO_BATHYMETRY_TILE_BASE_PATH = "/bathymetry/etopo-2022";
export const BATHYMETRY_TILE_BASE_PATH = GEBCO_BATHYMETRY_TILE_BASE_PATH;
export const BATHYMETRY_TILE_URL = `${BATHYMETRY_TILE_BASE_PATH}/terrain/{z}/{x}/{y}.png`;
export const BATHYMETRY_COLOR_TILE_URL = `${BATHYMETRY_TILE_BASE_PATH}/color/{z}/{x}/{y}.png`;
export const BATHYMETRY_CONTOUR_GEOJSON_URL = `${BATHYMETRY_TILE_BASE_PATH}/contours.geojson`;
export const BATHYMETRY_METADATA_URL = `${BATHYMETRY_TILE_BASE_PATH}/metadata.json`;

export const BATHYMETRY_BOUNDS = [128.5, 32.5, 130.8, 34.0] as const;
export const BATHYMETRY_SOURCE_RESOLUTION = "GEBCO_2026 15 arc-second primary / ETOPO 2022 60 arc-second fallback";
export const BATHYMETRY_MIN_ZOOM = 7;
export const BATHYMETRY_MAX_ZOOM = 8;

export const BATHYMETRY_ATTRIBUTION = "水深・地形: GEBCO Compilation Group (2026) GEBCO_2026 Grid";
export const ETOPO_BATHYMETRY_ATTRIBUTION = "水深・地形fallback: NOAA NCEI ETOPO 2022 60 Arc-Second Bedrock";
export const BATHYMETRY_LICENSE_NOTE = "GEBCO_2026 15秒 / ETOPO 2022 60秒fallback / CC BY 4.0・CC0-1.0";
export const BATHYMETRY_SAFETY_NOTE = "参考表示。航海・安全判断には使用不可";
export const BATHYMETRY_CITATION =
  "GEBCO Compilation Group (2026) GEBCO_2026 Grid; fallback NOAA National Centers for Environmental Information. 2022: ETOPO 2022 60 Arc-Second Bedrock Global Relief Model. https://doi.org/10.25921/fd45-gt74";

export const BATHYMETRY_DEPTH_STOPS = [
  { depthMeters: 0, label: "0m", color: "#bff4ff" },
  { depthMeters: 20, label: "20m", color: "#6dd7f3" },
  { depthMeters: 50, label: "50m", color: "#2da9e1" },
  { depthMeters: 100, label: "100m", color: "#1479c9" },
  { depthMeters: 200, label: "200m", color: "#0f4f9f" },
  { depthMeters: 500, label: "500m以上", color: "#08275f" },
] as const;

export type DeviceCapabilityInput = { width: number; prefersReducedMotion: boolean; deviceMemory?: number; webglAvailable: boolean };
export function shouldEnableInitialTerrain(input: DeviceCapabilityInput) {
  return input.webglAvailable && input.width >= 720 && !input.prefersReducedMotion && (input.deviceMemory ?? 4) >= 4;
}
export function formatDepthLabel(elevationMeters: number) { return `${Math.abs(Math.round(elevationMeters))}m`; }
export function bathymetryVisibility(mode: "standard" | "aerial" | "bathymetry", terrainEnabled: boolean) {
  return { showBathymetry: mode === "bathymetry", terrain: mode === "bathymetry" && terrainEnabled };
}
