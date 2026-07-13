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

export const BATHYMETRY_POINT_BLOCKED_TARGET_SELECTORS = [
  ".maplibregl-marker",
  ".maplibregl-ctrl",
  ".bathymetryPanel",
  ".mapLayerToggle",
  ".bathymetryPointCard",
] as const;

export function shouldClearBathymetryPointSelection(params: {
  previousMode: MapLayerMode;
  previousDisplay: BathymetryDisplaySource;
  nextMode: MapLayerMode;
  nextDisplay: BathymetryDisplaySource;
}) {
  return params.previousMode !== params.nextMode || params.previousDisplay !== params.nextDisplay;
}

export function applyBathymetryPointSelectionClear<T>(params: {
  selectionId: number;
  selection: T | null;
}) {
  return { selectionId: params.selectionId + 1, selection: null as T | null };
}

export function getBathymetryPointBlockedAncestor(target: EventTarget | null | undefined) {
  const maybeElement = target as { closest?: (selector: string) => Element | null } | null | undefined;
  if (!maybeElement || typeof maybeElement.closest !== "function") return null;
  for (const selector of BATHYMETRY_POINT_BLOCKED_TARGET_SELECTORS) {
    const ancestor = maybeElement.closest(selector);
    if (ancestor) return ancestor;
  }
  return null;
}

export function shouldIgnoreBathymetryPointEvent(params: {
  mode: MapLayerMode;
  display: BathymetryDisplaySource;
  defaultPrevented?: boolean;
  dragging?: boolean;
  rotating?: boolean;
  zooming?: boolean;
  pitching?: boolean;
  gestureSuppressed?: boolean;
  blockedAncestor?: Element | null;
}) {
  if (!shouldLookupBathymetryPoint(params.mode, params.display)) return true;
  if (params.defaultPrevented || params.dragging || params.rotating || params.zooming || params.pitching || params.gestureSuppressed) return true;
  return Boolean(params.blockedAncestor);
}

export type BathymetryPointGestureState = {
  active: boolean;
  moved: boolean;
  suppressNextClick: boolean;
  startX: number;
  startY: number;
  startTime: number;
};

export const BATHYMETRY_POINT_TAP_MAX_DISTANCE_PX = 10;
export const BATHYMETRY_POINT_TAP_MAX_MS = 700;

export function createBathymetryPointGestureState(): BathymetryPointGestureState {
  return { active: false, moved: false, suppressNextClick: false, startX: 0, startY: 0, startTime: 0 };
}

export function beginBathymetryPointPointerGesture(state: BathymetryPointGestureState, x: number, y: number, time: number) {
  state.active = true;
  state.moved = false;
  state.startX = x;
  state.startY = y;
  state.startTime = time;
}

export function moveBathymetryPointPointerGesture(state: BathymetryPointGestureState, x: number, y: number) {
  if (!state.active) return;
  if (Math.hypot(x - state.startX, y - state.startY) > BATHYMETRY_POINT_TAP_MAX_DISTANCE_PX) state.moved = true;
}

export function endBathymetryPointPointerGesture(state: BathymetryPointGestureState, x: number, y: number, time: number) {
  if (!state.active) return false;
  const moved = state.moved || Math.hypot(x - state.startX, y - state.startY) > BATHYMETRY_POINT_TAP_MAX_DISTANCE_PX;
  const slow = time - state.startTime > BATHYMETRY_POINT_TAP_MAX_MS;
  state.active = false;
  state.moved = false;
  state.suppressNextClick = moved || slow;
  return !state.suppressNextClick;
}

export function noteBathymetryPointMapGesture(state: BathymetryPointGestureState) {
  state.active = false;
  state.moved = false;
  state.suppressNextClick = true;
}

export function consumeBathymetryPointSuppressedClick(state: BathymetryPointGestureState) {
  const suppressed = state.suppressNextClick;
  state.suppressNextClick = false;
  return suppressed;
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


export type BathymetryTileImageDataLoader<T> = (url: string) => Promise<T>;

export class BathymetryTileImageDataStore<T> {
  private readonly completed: BathymetryTileCache<T>;
  private readonly inFlight = new Map<string, Promise<T>>();

  constructor(limit = BATHYMETRY_POINT_CACHE_LIMIT) {
    this.completed = new BathymetryTileCache<T>(limit);
  }

  load(url: string, loader: BathymetryTileImageDataLoader<T>) {
    const cached = this.completed.get(url);
    if (cached !== undefined) return Promise.resolve(cached);
    const existing = this.inFlight.get(url);
    if (existing) return existing;
    const pending = loader(url)
      .then((value) => {
        this.completed.set(url, value);
        return value;
      })
      .finally(() => {
        this.inFlight.delete(url);
      });
    this.inFlight.set(url, pending);
    return pending;
  }

  clearCompleted() { this.completed.clear(); }
  get completedSize() { return this.completed.size; }
  get inFlightSize() { return this.inFlight.size; }
}
