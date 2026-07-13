import {
  BATHYMETRY_BOUNDS,
  BATHYMETRY_FALLBACK_TILE_URL,
  BATHYMETRY_SOURCE_RESOLUTION,
  BATHYMETRY_FALLBACK_RESOLUTION,
  BATHYMETRY_TILE_URL,
} from "./bathymetry";
import type { BathymetryDisplaySource } from "./bathymetryFallback";
import type { MapLayerMode } from "./mapLayer";

export type BathymetryLookupSource = Extract<BathymetryDisplaySource, "gebco" | "etopo">;
export type BathymetryPointStatus = "loading" | "success" | "land" | "out-of-bounds" | "error";

export type BathymetryPointTileConfig = {
  source: BathymetryLookupSource;
  zoom: number;
  template: string;
  label: string;
  resolution: string;
};

export type BathymetryTilePixel = {
  source: BathymetryLookupSource;
  zoom: number;
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  url: string;
};

export type BathymetryPointResult =
  | { status: "success"; depthMeters: number; displayDepth: string; elevationMeters: number }
  | { status: "land"; elevationMeters: number; displayDepth: "陸地または0m以上" }
  | { status: "out-of-bounds"; message: "対象範囲外" }
  | { status: "error"; message: "水深を取得できません" };

export const BATHYMETRY_POINT_TILE_SIZE = 256;
export const BATHYMETRY_POINT_CACHE_LIMIT = 24;

export const BATHYMETRY_POINT_TILE_CONFIGS = {
  gebco: {
    source: "gebco",
    zoom: 9,
    template: BATHYMETRY_TILE_URL,
    label: "GEBCO_2026",
    resolution: BATHYMETRY_SOURCE_RESOLUTION,
  },
  etopo: {
    source: "etopo",
    zoom: 8,
    template: BATHYMETRY_FALLBACK_TILE_URL,
    label: "ETOPO 2022 fallback",
    resolution: BATHYMETRY_FALLBACK_RESOLUTION,
  },
} as const satisfies Record<BathymetryLookupSource, BathymetryPointTileConfig>;

export function getBathymetryPointTileConfig(source: BathymetryLookupSource) {
  return BATHYMETRY_POINT_TILE_CONFIGS[source];
}

export function shouldLookupBathymetryPoint(mode: MapLayerMode, display: BathymetryDisplaySource) {
  return mode === "bathymetry" && (display === "gebco" || display === "etopo");
}

export function isWithinBathymetryPointBounds(lon: number, lat: number, bounds = BATHYMETRY_BOUNDS) {
  const [west, south, east, north] = bounds;
  return lon >= west && lon <= east && lat >= south && lat <= north;
}

export function buildBathymetryTileUrl(template: string, z: number, x: number, y: number) {
  return template
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

export function lonLatToBathymetryTilePixel(
  lon: number,
  lat: number,
  source: BathymetryLookupSource,
): BathymetryTilePixel | null {
  if (!isWithinBathymetryPointBounds(lon, lat)) return null;
  const config = getBathymetryPointTileConfig(source);
  const n = 2 ** config.zoom;
  const normalizedLon = (lon + 180) / 360;
  const latRad = (lat * Math.PI) / 180;
  const mercatorY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
  const tileFloatX = normalizedLon * n;
  const tileFloatY = mercatorY * n;
  const x = Math.floor(tileFloatX);
  const y = Math.floor(tileFloatY);
  return {
    source,
    zoom: config.zoom,
    x,
    y,
    pixelX: Math.min(BATHYMETRY_POINT_TILE_SIZE - 1, Math.max(0, Math.floor((tileFloatX - x) * BATHYMETRY_POINT_TILE_SIZE))),
    pixelY: Math.min(BATHYMETRY_POINT_TILE_SIZE - 1, Math.max(0, Math.floor((tileFloatY - y) * BATHYMETRY_POINT_TILE_SIZE))),
    url: buildBathymetryTileUrl(config.template, config.zoom, x, y),
  };
}

export function decodeTerrainRgb(r: number, g: number, b: number) {
  return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;
}

export function bathymetryElevationToPointResult(elevationMeters: number): BathymetryPointResult {
  if (!Number.isFinite(elevationMeters)) return { status: "error", message: "水深を取得できません" };
  if (elevationMeters >= 0) {
    return { status: "land", elevationMeters, displayDepth: "陸地または0m以上" };
  }
  const depthMeters = Math.round(-elevationMeters);
  return {
    status: "success",
    depthMeters,
    displayDepth: `約${depthMeters}m`,
    elevationMeters,
  };
}

export function shouldAcceptBathymetryPointResult(selectionId: number, latestSelectionId: number) {
  return selectionId === latestSelectionId;
}

export function shouldIgnoreBathymetryPointEvent(params: {
  mode: MapLayerMode;
  display: BathymetryDisplaySource;
  defaultPrevented?: boolean;
  dragging?: boolean;
  rotating?: boolean;
  zooming?: boolean;
  pitching?: boolean;
  targetClasses?: readonly string[];
}) {
  if (!shouldLookupBathymetryPoint(params.mode, params.display)) return true;
  if (params.defaultPrevented || params.dragging || params.rotating || params.zooming || params.pitching) return true;
  const blocked = ["maplibregl-marker", "maplibregl-ctrl", "bathymetryPanel", "mapLayerToggle"];
  return Boolean(params.targetClasses?.some((className) => blocked.some((item) => className.includes(item))));
}

export class BathymetryTileCache<T> {
  private entries = new Map<string, T>();
  constructor(private readonly limit = BATHYMETRY_POINT_CACHE_LIMIT) {}
  get(key: string) {
    const value = this.entries.get(key);
    if (value === undefined) return undefined;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }
  set(key: string, value: T) {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
  clear() { this.entries.clear(); }
  get size() { return this.entries.size; }
}
