import {
  BATHYMETRY_COLOR_LAYER_ID,
  BATHYMETRY_CONTOUR_LABEL_LAYER_ID,
  BATHYMETRY_CONTOUR_LAYER_ID,
  BATHYMETRY_FALLBACK_COLOR_LAYER_ID,
  BATHYMETRY_FALLBACK_CONTOUR_LABEL_LAYER_ID,
  BATHYMETRY_FALLBACK_CONTOUR_LAYER_ID,
  BATHYMETRY_FALLBACK_HILLSHADE_LAYER_ID,
  BATHYMETRY_FALLBACK_SEA_SURFACE_LAYER_ID,
  BATHYMETRY_FALLBACK_SOURCE_ID,
  BATHYMETRY_HILLSHADE_LAYER_ID,
  BATHYMETRY_SEA_SURFACE_LAYER_ID,
  BATHYMETRY_SOURCE_ID,
  BATHYMETRY_VIEW_PRESETS,
  normalizeBathymetryExaggeration,
  type BathymetryViewPreset,
} from "./bathymetry";
import type { BathymetryDisplaySource } from "./bathymetryFallback";
import type { MapLayerMode } from "./mapLayer";

export type TerrainCommand = { source: string; exaggeration: number } | null;
export type CurrentTerrain = { source: string; exaggeration?: number } | null;
export type TerrainMap = {
  setTerrain: (terrain: TerrainCommand) => void;
  getTerrain?: () => CurrentTerrain | undefined;
  triggerRepaint?: () => void;
};
export type BathymetryLayerVisibility = Record<string, boolean>;
export type BathymetryOverlayToggles = {
  hillshadeEnabled: boolean;
  contoursEnabled: boolean;
};
export type CameraMap = {
  stop: () => void;
  easeTo: (options: BathymetryCameraOptions) => void;
  jumpTo: (options: BathymetryCameraOptions) => void;
  once?: (type: string, listener: () => void) => void;
  off?: (type: string, listener: () => void) => void;
};

export type BathymetryCameraOptions = {
  pitch: number;
  bearing: number;
  duration: number;
  essential: false;
};

export type BathymetryCameraTransitionManager = {
  active: boolean;
  token: number;
  timerId: ReturnType<typeof setTimeout> | null;
  finishListener: (() => void) | null;
};

export function createBathymetryCameraTransitionManager(): BathymetryCameraTransitionManager {
  return { active: false, token: 0, timerId: null, finishListener: null };
}

export function clearBathymetryCameraTransition(
  manager: BathymetryCameraTransitionManager,
  map?: Pick<CameraMap, "off"> | null,
) {
  manager.token += 1;
  manager.active = false;
  if (manager.timerId) {
    clearTimeout(manager.timerId);
    manager.timerId = null;
  }
  if (manager.finishListener && map?.off) {
    map.off("moveend", manager.finishListener);
  }
  manager.finishListener = null;
}

export function buildBathymetryTerrainCommand({
  display,
  exaggeration,
  terrainEnabled = true,
}: {
  display: BathymetryDisplaySource;
  exaggeration: number;
  terrainEnabled?: boolean;
}): TerrainCommand {
  if (!terrainEnabled || display === "standard") return null;
  return {
    source: display === "gebco" ? BATHYMETRY_SOURCE_ID : BATHYMETRY_FALLBACK_SOURCE_ID,
    exaggeration: normalizeBathymetryExaggeration(exaggeration),
  };
}

const PRIMARY_VISIBILITY_LAYER_IDS = {
  color: BATHYMETRY_COLOR_LAYER_ID,
  hillshade: BATHYMETRY_HILLSHADE_LAYER_ID,
  contour: BATHYMETRY_CONTOUR_LAYER_ID,
  contourLabel: BATHYMETRY_CONTOUR_LABEL_LAYER_ID,
  seaSurface: BATHYMETRY_SEA_SURFACE_LAYER_ID,
} as const;

const FALLBACK_VISIBILITY_LAYER_IDS = {
  color: BATHYMETRY_FALLBACK_COLOR_LAYER_ID,
  hillshade: BATHYMETRY_FALLBACK_HILLSHADE_LAYER_ID,
  contour: BATHYMETRY_FALLBACK_CONTOUR_LAYER_ID,
  contourLabel: BATHYMETRY_FALLBACK_CONTOUR_LABEL_LAYER_ID,
  seaSurface: BATHYMETRY_FALLBACK_SEA_SURFACE_LAYER_ID,
} as const;

export function buildBathymetryLayerVisibility({
  mode,
  display,
  hillshadeEnabled,
  contoursEnabled,
}: {
  mode: MapLayerMode;
  display: BathymetryDisplaySource;
} & BathymetryOverlayToggles): BathymetryLayerVisibility {
  const visibility: BathymetryLayerVisibility = {};
  for (const ids of [PRIMARY_VISIBILITY_LAYER_IDS, FALLBACK_VISIBILITY_LAYER_IDS]) {
    visibility[ids.color] = false;
    visibility[ids.hillshade] = false;
    visibility[ids.contour] = false;
    visibility[ids.contourLabel] = false;
    visibility[ids.seaSurface] = false;
  }
  if (mode !== "bathymetry" || display === "standard") return visibility;
  const active =
    display === "gebco" ? PRIMARY_VISIBILITY_LAYER_IDS : FALLBACK_VISIBILITY_LAYER_IDS;
  visibility[active.color] = true;
  visibility[active.hillshade] = hillshadeEnabled;
  visibility[active.contour] = contoursEnabled;
  visibility[active.contourLabel] = contoursEnabled;
  visibility[active.seaSurface] = true;
  return visibility;
}

export type BathymetryTerrainApplyResult = {
  command: TerrainCommand;
  previous: CurrentTerrain | undefined;
  applied: boolean;
  clearedBeforeApply: boolean;
};

export function terrainsMatch(
  current: CurrentTerrain | undefined,
  requested: TerrainCommand,
) {
  if (!current || !requested) return current === requested;
  return (
    current.source === requested.source &&
    normalizeBathymetryExaggeration(current.exaggeration ?? 1) ===
      normalizeBathymetryExaggeration(requested.exaggeration)
  );
}

export function shouldApplyBathymetryTerrain({
  current,
  requested,
}: {
  current: CurrentTerrain | undefined;
  requested: TerrainCommand;
}) {
  return !terrainsMatch(current, requested);
}

export function applyBathymetryTerrain(
  map: TerrainMap,
  input: Parameters<typeof buildBathymetryTerrainCommand>[0],
): BathymetryTerrainApplyResult {
  const command = buildBathymetryTerrainCommand(input);
  const previous = map.getTerrain?.();
  if (!shouldApplyBathymetryTerrain({ current: previous, requested: command })) {
    return { command, previous, applied: false, clearedBeforeApply: false };
  }

  const mustRefreshSameSourceGeometry = Boolean(
    previous &&
      command &&
      previous.source === command.source &&
      normalizeBathymetryExaggeration(previous.exaggeration ?? 1) !== command.exaggeration,
  );
  if (mustRefreshSameSourceGeometry) {
    map.setTerrain(null);
  }
  map.setTerrain(command);
  map.triggerRepaint?.();
  return {
    command,
    previous,
    applied: true,
    clearedBeforeApply: mustRefreshSameSourceGeometry,
  };
}

export function buildBathymetryCameraOptions({
  preset,
  reducedMotion,
  duration = 260,
}: {
  preset: BathymetryViewPreset;
  reducedMotion: boolean;
  duration?: number;
}): BathymetryCameraOptions {
  return {
    pitch: preset.pitch,
    bearing: preset.bearing,
    duration: reducedMotion ? 0 : duration,
    essential: false,
  };
}

export function runBathymetryCameraTransition({
  map,
  manager,
  preset,
  reducedMotion,
  duration = 260,
  onComplete,
}: {
  map: CameraMap;
  manager: BathymetryCameraTransitionManager;
  preset: BathymetryViewPreset;
  reducedMotion: boolean;
  duration?: number;
  onComplete?: () => void;
}) {
  clearBathymetryCameraTransition(manager, map);
  map.stop();
  manager.active = true;
  const token = manager.token;
  const finish = () => {
    if (manager.token !== token) return;
    manager.active = false;
    if (manager.timerId) {
      clearTimeout(manager.timerId);
      manager.timerId = null;
    }
    if (manager.finishListener && map.off) map.off("moveend", manager.finishListener);
    manager.finishListener = null;
    onComplete?.();
  };
  manager.finishListener = finish;
  const options = buildBathymetryCameraOptions({ preset, reducedMotion, duration });
  if (reducedMotion) {
    map.jumpTo(options);
    finish();
  } else {
    if (map.once) map.once("moveend", finish);
    map.easeTo(options);
    manager.timerId = setTimeout(finish, duration + 120);
  }
}

export function shouldApplyBathymetryObliqueView({
  mode,
  previousMode,
  terrainEnabled,
  previousTerrainEnabled,
  initialBathymetryViewApplied,
}: {
  mode: MapLayerMode;
  previousMode: MapLayerMode | null;
  terrainEnabled: boolean;
  previousTerrainEnabled: boolean | null;
  initialBathymetryViewApplied: boolean;
}) {
  if (mode !== "bathymetry" || !terrainEnabled) return false;
  if (previousTerrainEnabled === false) return true;
  return previousMode !== "bathymetry" && !initialBathymetryViewApplied;
}

export function shouldClearPresetForCameraInteraction({
  originalEvent,
}: {
  originalEvent?: unknown;
}) {
  return Boolean(originalEvent);
}

export function getDefaultBathymetryViewPreset() {
  return BATHYMETRY_VIEW_PRESETS.find((preset) => preset.id === "oblique") ?? null;
}

export function getBathymetryTopViewPreset() {
  return BATHYMETRY_VIEW_PRESETS.find((preset) => preset.id === "top") ?? null;
}

export function getTerrainToggleCameraPreset({
  nextEnabled,
}: {
  nextEnabled: boolean;
}) {
  return nextEnabled ? null : getBathymetryTopViewPreset();
}
