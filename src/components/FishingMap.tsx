"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FishingSpot } from "@/domain/fishingSpot";
import type { FishingReport } from "@/domain/fishing";
import type { ExternalCatchMemo } from "@/lib/externalCatchMemoStorage";
import {
  GSI_AERIAL_TILE_ATTRIBUTION,
  GSI_AERIAL_TILE_NOTE,
  type MapLayerMode,
} from "@/domain/mapLayer";
import {
  BATHYMETRY_ATTRIBUTION,
  BATHYMETRY_BOUNDS,
  BATHYMETRY_COLOR_LAYER_ID,
  BATHYMETRY_COLOR_SOURCE_ID,
  BATHYMETRY_COLOR_TILE_URL,
  BATHYMETRY_CONTOUR_GEOJSON_URL,
  BATHYMETRY_CONTOUR_LABEL_LAYER_ID,
  BATHYMETRY_CONTOUR_LAYER_ID,
  BATHYMETRY_CONTOUR_SOURCE_ID,
  BATHYMETRY_DEPTH_STOPS,
  BATHYMETRY_FALLBACK_ATTRIBUTION,
  BATHYMETRY_FALLBACK_COLOR_LAYER_ID,
  BATHYMETRY_FALLBACK_COLOR_SOURCE_ID,
  BATHYMETRY_FALLBACK_COLOR_TILE_URL,
  BATHYMETRY_FALLBACK_CONTOUR_GEOJSON_URL,
  BATHYMETRY_FALLBACK_CONTOUR_LABEL_LAYER_ID,
  BATHYMETRY_FALLBACK_CONTOUR_LAYER_ID,
  BATHYMETRY_FALLBACK_CONTOUR_SOURCE_ID,
  BATHYMETRY_FALLBACK_HILLSHADE_LAYER_ID,
  BATHYMETRY_FALLBACK_LICENSE_NOTE,
  BATHYMETRY_FALLBACK_METADATA_URL,
  BATHYMETRY_FALLBACK_SEA_SURFACE_LAYER_ID,
  BATHYMETRY_FALLBACK_SOURCE_ID,
  BATHYMETRY_FALLBACK_TILE_URL,
  BATHYMETRY_HILLSHADE_LAYER_ID,
  BATHYMETRY_LICENSE_NOTE,
  BATHYMETRY_MAX_ZOOM,
  BATHYMETRY_METADATA_URL,
  BATHYMETRY_MIN_ZOOM,
  BATHYMETRY_SEA_SURFACE_LAYER_ID,
  BATHYMETRY_SOURCE_ID,
  BATHYMETRY_TILE_URL,
  BATHYMETRY_EXAGGERATION_DEFAULT,
  BATHYMETRY_EXAGGERATION_MAX,
  BATHYMETRY_EXAGGERATION_MIN,
  BATHYMETRY_EXAGGERATION_STEP,
  BATHYMETRY_VIEW_PRESETS,
  bathymetryControlsDisabled,
  classifyDeviceCapability,
  formatBathymetryExaggeration,
  normalizeBathymetryExaggeration,
  resetBathymetryExaggeration,
  lonLatToTidCell,
  terrainStatusLabel,
  summarizeTidAround,
  type DeviceCapabilityClass,
  type TerrainStatus,
  type TidSummary,
} from "@/domain/bathymetry";
import {
  classifyBathymetryError,
  initialBathymetryFallbackState,
  reduceBathymetryFallback,
  validateBathymetryMetadata,
} from "@/domain/bathymetryFallback";
import {
  BATHYMETRY_CONTOUR_GUIDANCE,
  applyBathymetryContourFilters,
  applyBathymetryMode,
  getBathymetryHillshadeProfile,
  clearBathymetryCameraTransition,
  createBathymetryCameraTransitionManager,
  getDefaultBathymetryViewPreset,
  getTerrainToggleCameraPreset,
  runBathymetryCameraTransition,
  shouldApplyBathymetryObliqueView,
  shouldClearPresetForCameraInteraction,
} from "@/domain/bathymetryView";
import {
  BathymetryTileImageDataStore,
  applyBathymetryPointSelectionClear,
  bathymetryElevationToPointResult,
  beginBathymetryPointPointerGesture,
  consumeBathymetryPointSuppressedClick,
  createBathymetryPointGestureState,
  endBathymetryPointPointerGesture,
  getBathymetryPointBlockedAncestor,
  moveBathymetryPointPointerGesture,
  noteBathymetryPointMapGesture,
  decodeTerrainRgb,
  getBathymetryPointTileConfig,
  lonLatToBathymetryTilePixel,
  shouldAcceptBathymetryPointResult,
  shouldClearBathymetryPointSelection,
  shouldIgnoreBathymetryPointEvent,
  type BathymetryLookupSource,
  type BathymetryPointResult,
} from "@/domain/bathymetryPoint";
import { MapLayerToggle } from "./MapLayerToggle";

type FishingMapProps = {
  reports: FishingReport[];
  externalMemos: ExternalCatchMemo[];
  spots: FishingSpot[];
};

type MappableExternalMemo = ExternalCatchMemo & {
  latitude: number;
  longitude: number;
  spotName: string;
};

type BathymetryViewPresetId = (typeof BATHYMETRY_VIEW_PRESETS)[number]["id"];

type TidGrid = {
  values: number[];
  width: number;
  height: number;
  nodata: number;
};

type BathymetrySelection = {
  id: number;
  lon: number;
  lat: number;
  source: BathymetryLookupSource;
  result: BathymetryPointResult | { status: "loading" };
};

const PRIMARY_LAYER_IDS = [
  BATHYMETRY_COLOR_LAYER_ID,
  BATHYMETRY_HILLSHADE_LAYER_ID,
  BATHYMETRY_CONTOUR_LAYER_ID,
  BATHYMETRY_CONTOUR_LABEL_LAYER_ID,
  BATHYMETRY_SEA_SURFACE_LAYER_ID,
] as const;

const FALLBACK_LAYER_IDS = [
  BATHYMETRY_FALLBACK_COLOR_LAYER_ID,
  BATHYMETRY_FALLBACK_HILLSHADE_LAYER_ID,
  BATHYMETRY_FALLBACK_CONTOUR_LAYER_ID,
  BATHYMETRY_FALLBACK_CONTOUR_LABEL_LAYER_ID,
  BATHYMETRY_FALLBACK_SEA_SURFACE_LAYER_ID,
] as const;

export function FishingMap({ reports, externalMemos, spots }: FishingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasAdjustedBoundsRef = useRef(false);
  const cameraTransitionRef = useRef(createBathymetryCameraTransitionManager());
  const previousModeRef = useRef<MapLayerMode | null>(null);
  const previousTerrainEnabledRef = useRef<boolean | null>(null);
  const initialBathymetryViewAppliedRef = useRef(false);
  const suppressNextAutoObliqueRef = useRef(false);
  const bathymetrySelectionIdRef = useRef(0);
  const bathymetryTileStoreRef = useRef(
    new BathymetryTileImageDataStore<ImageData>(),
  );
  const bathymetryGestureRef = useRef(createBathymetryPointGestureState());
  const bathymetryMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapLayerMode, setMapLayerMode] = useState<MapLayerMode>("standard");
  const [isTerrainEnabled, setIsTerrainEnabled] = useState(false);
  const [terrainExaggeration, setTerrainExaggeration] = useState(
    BATHYMETRY_EXAGGERATION_DEFAULT,
  );
  const [hillshadeEnabled, setHillshadeEnabled] = useState(true);
  const [contoursEnabled, setContoursEnabled] = useState(true);
  const [selectedViewPreset, setSelectedViewPreset] =
    useState<BathymetryViewPresetId | null>(null);
  const [terrainStatus, setTerrainStatus] = useState<TerrainStatus>("2d");
  const [deviceCapability, setDeviceCapability] =
    useState<DeviceCapabilityClass | null>(null);
  const [bathymetryRuntime, setBathymetryRuntime] = useState(
    initialBathymetryFallbackState,
  );
  const previousBathymetryPointModeRef = useRef(mapLayerMode);
  const previousBathymetryPointDisplayRef = useRef(bathymetryRuntime.display);
  const [tidExpanded, setTidExpanded] = useState(false);
  const [tidGrid, setTidGrid] = useState<TidGrid | null>(null);
  const [tidSummary, setTidSummary] = useState<TidSummary | null>(null);
  const [tidStatus, setTidStatus] = useState("TID正本を読み込み中です");
  const [bathymetrySelection, setBathymetrySelection] =
    useState<BathymetrySelection | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [129.95, 33.48],
      zoom: 8.2,
    });
    mapRef.current = map;

    const onLoad = () => addAerialPhotoLayer(map);
    const onError = (event: maplibregl.ErrorEvent) => {
      const sourceId = (event as maplibregl.ErrorEvent & { sourceId?: string })
        .sourceId;
      const message = event.error?.message ?? "unknown-map-error";
      const source = classifyBathymetryError({ sourceId, message });
      if (!source) return;
      const key = `${sourceId ?? "unknown"}:${message.slice(0, 160)}`;
      setBathymetryRuntime((current) =>
        reduceBathymetryFallback(current, {
          type: "source-error",
          source,
          key,
        }),
      );
    };

    map.on("load", onLoad);
    map.on("error", onError);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

    return () => {
      map.off("load", onLoad);
      map.off("error", onError);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/bathymetry/gebco-2026/tid-crop.json")
      .then((response) => {
        if (!response.ok)
          throw new Error(`TID fetch failed: ${response.status}`);
        return response.json();
      })
      .then((data: TidGrid) => {
        if (
          data.width !== 552 ||
          data.height !== 360 ||
          data.nodata !== 127 ||
          !Array.isArray(data.values) ||
          data.values.length !== data.width * data.height
        ) {
          throw new Error("TID metadata or value shape is invalid");
        }
        if (!cancelled) setTidGrid(data);
      })
      .catch(() => {
        if (!cancelled) setTidStatus("データ由来を表示できません");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tidGrid) return;

    const update = () => {
      const center = map.getCenter();
      const cell = lonLatToTidCell(
        center.lng,
        center.lat,
        tidGrid.width,
        tidGrid.height,
      );
      if (!cell) {
        setTidSummary(null);
        setTidStatus("対象範囲外のためデータ由来を表示できません");
        return;
      }
      const summary = summarizeTidAround(
        tidGrid.values,
        tidGrid.width,
        tidGrid.height,
        cell.col,
        cell.row,
        8,
      );
      if (!summary.sampleCells) {
        setTidSummary(null);
        setTidStatus("有効なTIDセルがないためデータ由来を表示できません");
        return;
      }
      setTidSummary(summary);
      setTidStatus("");
    };

    update();
    map.on("moveend", update);
    return () => {
      map.off("moveend", update);
    };
  }, [tidGrid]);

  const mappableExternalMemos = useMemo(
    () =>
      externalMemos.flatMap((memo): MappableExternalMemo[] => {
        const spot = memo.spotId
          ? spots.find((item) => item.id === memo.spotId)
          : undefined;
        return spot
          ? [
              {
                ...memo,
                latitude: spot.latitude,
                longitude: spot.longitude,
                spotName: spot.name,
              },
            ]
          : [];
      }),
    [externalMemos, spots],
  );

  useEffect(() => {
    const map = mapRef.current;
    const markerPoints = [...reports, ...mappableExternalMemos];
    if (!map || markerPoints.length === 0) return;

    const adjustMapBounds = () => {
      fitMapToPoints(map, markerPoints, hasAdjustedBoundsRef.current);
      hasAdjustedBoundsRef.current = true;
    };

    if (map.loaded()) adjustMapBounds();
    else map.once("load", adjustMapBounds);

    return () => {
      map.off("load", adjustMapBounds);
    };
  }, [mappableExternalMemos, reports]);

  useEffect(() => {
    const supportsWebGl =
      Boolean(containerRef.current) &&
      (() => {
        const canvas = document.createElement("canvas");
        return Boolean(
          canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
        );
      })();
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const deviceMemory =
      "deviceMemory" in navigator
        ? Number(
            (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
          )
        : undefined;
    const capability = classifyDeviceCapability({
      width: window.innerWidth,
      prefersReducedMotion,
      deviceMemory,
      webglAvailable: supportsWebGl,
    });
    setDeviceCapability(capability);
    setIsTerrainEnabled(capability.initialTerrainEnabled);
    setTerrainStatus(
      capability.mode === "unsupported"
        ? "unsupported"
        : capability.initialTerrainEnabled
          ? "3d"
          : "2d",
    );
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const manager = cameraTransitionRef.current;
    if (!map) return;

    const clearManualPreset = (event: { originalEvent?: unknown }) => {
      if (
        !shouldClearPresetForCameraInteraction({
          originalEvent: event.originalEvent,
        })
      ) {
        return;
      }
      clearBathymetryCameraTransition(manager, map);
      setSelectedViewPreset(null);
    };

    map.on("pitchstart", clearManualPreset);
    map.on("rotatestart", clearManualPreset);
    return () => {
      map.off("pitchstart", clearManualPreset);
      map.off("rotatestart", clearManualPreset);
      clearBathymetryCameraTransition(manager, map);
    };
  }, []);

  useEffect(() => {
    if (mapLayerMode !== "bathymetry") return;
    if (bathymetryRuntime.display === "standard") {
      setMapLayerMode("standard");
      return;
    }

    const source = bathymetryRuntime.display;
    const metadataUrl =
      source === "gebco"
        ? BATHYMETRY_METADATA_URL
        : BATHYMETRY_FALLBACK_METADATA_URL;
    const controller = new AbortController();

    fetch(metadataUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`metadata-http-${response.status}`);
        }
        return response.json();
      })
      .then((metadata) => {
        const validationError = validateBathymetryMetadata(metadata, source);
        if (validationError) throw new Error(validationError);
        setBathymetryRuntime((current) =>
          reduceBathymetryFallback(current, {
            type: "source-success",
            source,
          }),
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "metadata-error";
        setBathymetryRuntime((current) =>
          reduceBathymetryFallback(current, {
            type: "source-error",
            source,
            key: message,
          }),
        );
      });

    return () => controller.abort();
  }, [bathymetryRuntime.display, mapLayerMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyLayerMode = () => {
      setAerialLayerVisibility(map, mapLayerMode === "aerial");
      let terrainApplyFailed = false;
      applyBathymetryMode({
        map,
        mode: mapLayerMode,
        display: bathymetryRuntime.display,
        terrainEnabled: isTerrainEnabled,
        terrainExaggeration,
        hillshadeEnabled,
        contoursEnabled,
        setTerrainStatus,
        onTerrainRollback: () => {
          terrainApplyFailed = true;
          setIsTerrainEnabled(false);
          setSelectedViewPreset(null);
        },
        addPrimaryBathymetryLayers: (targetMap) => addPrimaryBathymetryLayers(targetMap as maplibregl.Map),
        addFallbackBathymetryLayers: (targetMap) => addFallbackBathymetryLayers(targetMap as maplibregl.Map),
        removeBathymetryRuntimeLayers: (targetMap) => removeBathymetryRuntimeLayers(targetMap as maplibregl.Map),
      });
      if (!isTerrainEnabled) setSelectedViewPreset(null);
      if (
        bathymetryRuntime.display !== "standard" &&
        !terrainApplyFailed &&
        !suppressNextAutoObliqueRef.current &&
        shouldApplyBathymetryObliqueView({
          mode: mapLayerMode,
          previousMode: previousModeRef.current,
          terrainEnabled: isTerrainEnabled,
          previousTerrainEnabled: previousTerrainEnabledRef.current,
          initialBathymetryViewApplied: initialBathymetryViewAppliedRef.current,
        })
      ) {
        const oblique = getDefaultBathymetryViewPreset();
        if (oblique) {
          moveCameraTo(oblique, 320);
          setSelectedViewPreset(oblique.id);
          initialBathymetryViewAppliedRef.current = true;
        }
      }
      applyBathymetryContourFilters({
        map,
        mode: mapLayerMode,
        display: bathymetryRuntime.display,
        zoom: map.getZoom(),
        compact: deviceCapability?.reason === "compact",
        contoursEnabled,
      });
      suppressNextAutoObliqueRef.current = false;
      previousModeRef.current = mapLayerMode;
      previousTerrainEnabledRef.current = isTerrainEnabled;
    };

    if (map.loaded()) applyLayerMode();
    else map.once("load", applyLayerMode);
    return () => {
      map.off("load", applyLayerMode);
    };
  }, [
    bathymetryRuntime.display,
    contoursEnabled,
    deviceCapability?.reason,
    hillshadeEnabled,
    isTerrainEnabled,
    mapLayerMode,
    terrainExaggeration,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const applyContourDensity = () => {
      applyBathymetryContourFilters({
        map,
        mode: mapLayerMode,
        display: bathymetryRuntime.display,
        zoom: map.getZoom(),
        compact: deviceCapability?.reason === "compact",
        contoursEnabled,
      });
    };

    if (map.loaded()) applyContourDensity();
    else map.once("load", applyContourDensity);
    map.on("zoom", applyContourDensity);
    return () => {
      map.off("load", applyContourDensity);
      map.off("zoom", applyContourDensity);
    };
  }, [bathymetryRuntime.display, contoursEnabled, deviceCapability?.reason, mapLayerMode]);

  useEffect(() => {
    const previousMode = previousBathymetryPointModeRef.current;
    const previousDisplay = previousBathymetryPointDisplayRef.current;
    previousBathymetryPointModeRef.current = mapLayerMode;
    previousBathymetryPointDisplayRef.current = bathymetryRuntime.display;
    if (
      shouldClearBathymetryPointSelection({
        previousMode,
        previousDisplay,
        nextMode: mapLayerMode,
        nextDisplay: bathymetryRuntime.display,
      })
    ) {
      const cleared = applyBathymetryPointSelectionClear({
        selectionId: bathymetrySelectionIdRef.current,
        selection: null as BathymetrySelection | null,
      });
      bathymetrySelectionIdRef.current = cleared.selectionId;
      setBathymetrySelection(cleared.selection);
    }
  }, [bathymetryRuntime.display, mapLayerMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let mounted = true;

    const selectPoint = (event: maplibregl.MapMouseEvent) => {
      const originalEvent = event.originalEvent as MouseEvent | undefined;
      const blockedAncestor = getBathymetryPointBlockedAncestor(
        originalEvent?.target,
      );
      const gestureSuppressed = consumeBathymetryPointSuppressedClick(
        bathymetryGestureRef.current,
      );
      if (
        shouldIgnoreBathymetryPointEvent({
          mode: mapLayerMode,
          display: bathymetryRuntime.display,
          defaultPrevented: originalEvent?.defaultPrevented,
          dragging: map.isMoving(),
          rotating: map.isRotating(),
          zooming: map.isZooming(),
          pitching:
            map.isMoving() &&
            map.getPitch() > 0 &&
            originalEvent?.type !== "click",
          gestureSuppressed,
          blockedAncestor,
        })
      ) {
        return;
      }

      const source = bathymetryRuntime.display as BathymetryLookupSource;
      const id = bathymetrySelectionIdRef.current + 1;
      bathymetrySelectionIdRef.current = id;
      const lon = event.lngLat.lng;
      const lat = event.lngLat.lat;
      setBathymetrySelection({
        id,
        lon,
        lat,
        source,
        result: { status: "loading" },
      });
      const tile = lonLatToBathymetryTilePixel(lon, lat, source);
      if (!tile) {
        setBathymetrySelection({
          id,
          lon,
          lat,
          source,
          result: { status: "out-of-bounds", message: "対象範囲外" },
        });
        return;
      }
      bathymetryTileStoreRef.current
        .load(tile.url, loadBathymetryTileImageData)
        .then((imageData) => {
          if (
            !mounted ||
            !shouldAcceptBathymetryPointResult(
              id,
              bathymetrySelectionIdRef.current,
            )
          )
            return;
          const offset = (tile.pixelY * imageData.width + tile.pixelX) * 4;
          const elevation = decodeTerrainRgb(
            imageData.data[offset],
            imageData.data[offset + 1],
            imageData.data[offset + 2],
          );
          setBathymetrySelection({
            id,
            lon,
            lat,
            source,
            result: bathymetryElevationToPointResult(elevation),
          });
        })
        .catch(() => {
          if (
            !mounted ||
            !shouldAcceptBathymetryPointResult(
              id,
              bathymetrySelectionIdRef.current,
            )
          )
            return;
          setBathymetrySelection({
            id,
            lon,
            lat,
            source,
            result: { status: "error", message: "水深を取得できません" },
          });
        });
    };

    const canvas = map.getCanvas();
    const pointerDown = (event: PointerEvent) =>
      beginBathymetryPointPointerGesture(
        bathymetryGestureRef.current,
        event.clientX,
        event.clientY,
        event.timeStamp,
      );
    const pointerMove = (event: PointerEvent) =>
      moveBathymetryPointPointerGesture(
        bathymetryGestureRef.current,
        event.clientX,
        event.clientY,
      );
    const pointerUp = (event: PointerEvent) =>
      endBathymetryPointPointerGesture(
        bathymetryGestureRef.current,
        event.clientX,
        event.clientY,
        event.timeStamp,
      );
    const suppressGestureClick = () =>
      noteBathymetryPointMapGesture(bathymetryGestureRef.current);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", suppressGestureClick);
    map.on("dragstart", suppressGestureClick);
    map.on("rotatestart", suppressGestureClick);
    map.on("pitchstart", suppressGestureClick);
    map.on("zoomstart", suppressGestureClick);
    map.on("click", selectPoint);
    return () => {
      mounted = false;
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", suppressGestureClick);
      map.off("dragstart", suppressGestureClick);
      map.off("rotatestart", suppressGestureClick);
      map.off("pitchstart", suppressGestureClick);
      map.off("zoomstart", suppressGestureClick);
      map.off("click", selectPoint);
    };
  }, [bathymetryRuntime.display, mapLayerMode]);

  useEffect(() => {
    const map = mapRef.current;
    bathymetryMarkerRef.current?.remove();
    bathymetryMarkerRef.current = null;
    if (!map || !bathymetrySelection) return;
    const element = document.createElement("div");
    element.className = "bathymetryPointMarker";
    element.setAttribute("aria-hidden", "true");
    bathymetryMarkerRef.current = new maplibregl.Marker({ element })
      .setLngLat([bathymetrySelection.lon, bathymetrySelection.lat])
      .addTo(map);
    return () => {
      bathymetryMarkerRef.current?.remove();
      bathymetryMarkerRef.current = null;
    };
  }, [bathymetrySelection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const reportMarkers = reports.map((report) =>
      new maplibregl.Marker({ color: scoreColor(report.forecast.score) })
        .setLngLat([report.longitude, report.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setDOMContent(
            createPopupContent(report),
          ),
        )
        .addTo(map),
    );

    const memoMarkers = mappableExternalMemos.map((memo) =>
      new maplibregl.Marker({ color: "#a855f7" })
        .setLngLat([memo.longitude, memo.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setDOMContent(
            createExternalMemoPopupContent(memo),
          ),
        )
        .addTo(map),
    );

    return () =>
      [...reportMarkers, ...memoMarkers].forEach((marker) => marker.remove());
  }, [mappableExternalMemos, reports]);

  const handleLayerModeChange = (nextMode: MapLayerMode) => {
    if (nextMode === "bathymetry") {
      setBathymetryRuntime((current) =>
        reduceBathymetryFallback(current, { type: "enter-bathymetry" }),
      );
    }
    setMapLayerMode(nextMode);
  };

  const controlsDisabled = bathymetryControlsDisabled(terrainStatus);
  const exaggerationLabel = formatBathymetryExaggeration(terrainExaggeration);

  const moveCameraTo = (
    preset: (typeof BATHYMETRY_VIEW_PRESETS)[number],
    duration = 260,
  ) => {
    const map = mapRef.current;
    if (!map) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    runBathymetryCameraTransition({
      map,
      manager: cameraTransitionRef.current,
      preset,
      reducedMotion: prefersReducedMotion,
      duration,
    });
  };

  const handleTerrainToggle = (nextEnabled: boolean) => {
    setIsTerrainEnabled(nextEnabled);
    const cameraPreset = getTerrainToggleCameraPreset({ nextEnabled });
    if (cameraPreset) {
      moveCameraTo(cameraPreset, 180);
    }
    if (!nextEnabled) {
      setSelectedViewPreset(null);
    }
  };

  const applyViewPreset = (
    preset: (typeof BATHYMETRY_VIEW_PRESETS)[number],
  ) => {
    const map = mapRef.current;
    if (!map || controlsDisabled) return;
    if (!isTerrainEnabled) {
      suppressNextAutoObliqueRef.current = true;
      setIsTerrainEnabled(true);
    }
    moveCameraTo(preset);
    setSelectedViewPreset(preset.id);
  };

  const fallbackActive = bathymetryRuntime.display === "etopo";
  const bathymetrySelectionConfig = bathymetrySelection
    ? getBathymetryPointTileConfig(bathymetrySelection.source)
    : null;

  return (
    <div className="mapShell">
      <div ref={containerRef} className="map" aria-label="釣果地点マップ" />
      <MapLayerToggle value={mapLayerMode} onChange={handleLayerModeChange} />
      {mapLayerMode === "bathymetry" ? (
        <>
          <div
            className="bathymetryPanel"
            aria-label="水深・3D地形の操作と凡例"
          >
            <label className="terrainToggle">
              <input
                type="checkbox"
                checked={isTerrainEnabled}
                disabled={controlsDisabled}
                onChange={(event) => handleTerrainToggle(event.target.checked)}
              />
              3D表示
            </label>
            <button
              className="terrainToggleButton"
              type="button"
              aria-expanded={tidExpanded}
              title="GEBCO TID Gridのデータ由来を表示"
              onClick={() => setTidExpanded((value) => !value)}
            >
              データ由来
            </button>
            <label className="terrainToggle compactToggle">
              <input
                type="checkbox"
                checked={hillshadeEnabled}
                onChange={(event) => setHillshadeEnabled(event.target.checked)}
              />
              陰影
            </label>
            <label className="terrainToggle compactToggle">
              <input
                type="checkbox"
                checked={contoursEnabled}
                onChange={(event) => setContoursEnabled(event.target.checked)}
              />
              等深線
            </label>
            <span className="terrainStatus">
              {terrainStatusLabel(terrainStatus, deviceCapability)}
            </span>
            <div className="terrainExaggerationControl">
              <div className="terrainControlHeader">
                <span>高さ {exaggerationLabel}</span>
                <button
                  className="terrainMiniButton"
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() =>
                    setTerrainExaggeration(resetBathymetryExaggeration())
                  }
                >
                  1.0×リセット
                </button>
              </div>
              <input
                aria-label={`高さ誇張 ${exaggerationLabel}`}
                type="range"
                min={BATHYMETRY_EXAGGERATION_MIN}
                max={BATHYMETRY_EXAGGERATION_MAX}
                step={BATHYMETRY_EXAGGERATION_STEP}
                value={terrainExaggeration}
                disabled={controlsDisabled}
                onChange={(event) =>
                  setTerrainExaggeration(
                    normalizeBathymetryExaggeration(Number(event.target.value)),
                  )
                }
              />
              {!isTerrainEnabled && terrainStatus !== "unsupported" ? (
                <small>3D OFF中の変更は次回3D表示時に適用されます。</small>
              ) : null}
            </div>
            <div className="terrainPresetControl" aria-label="3D視点プリセット">
              {BATHYMETRY_VIEW_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className="terrainToggleButton"
                  type="button"
                  aria-pressed={selectedViewPreset === preset.id}
                  disabled={controlsDisabled}
                  onClick={() => applyViewPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {tidExpanded ? (
              <div
                className="tidSummary"
                aria-label="GEBCO TID Gridによるデータ由来"
              >
                {tidSummary
                  ? `この周辺の水深データ: 実測 ${tidSummary.direct}% / 補間 ${tidSummary.predictedInterpolated}% / 混在・陸域 ${tidSummary.mixedUnknownLand}%${tidSummary.nodata ? ` / nodata ${tidSummary.nodata}セル` : ""}`
                  : tidStatus}
                <small>
                  GEBCO TID Gridによる中心周辺17×17セル（nodata
                  127は割合の分母から除外）の目安。沿岸では陸セル混在により比率が変動します。
                </small>
              </div>
            ) : null}
            <small className="bathymetryContourGuidance">{BATHYMETRY_CONTOUR_GUIDANCE}</small>
            <div className="bathymetryLegend" aria-label="水深凡例">
              {BATHYMETRY_DEPTH_STOPS.map((stop) => (
                <span key={stop.label}>
                  <i style={{ background: stop.color }} />
                  {stop.label}
                </span>
              ))}
            </div>
          </div>
          {bathymetrySelection && bathymetrySelectionConfig ? (
            <div
              className="bathymetryPointCard"
              role="status"
              aria-live="polite"
            >
              <div className="bathymetryPointHeader">
                <strong>タップ地点の参考水深</strong>
                <button
                  type="button"
                  className="bathymetryPointClose"
                  aria-label="タップ地点の参考水深を閉じる"
                  onClick={() => {
                    const cleared = applyBathymetryPointSelectionClear({
                      selectionId: bathymetrySelectionIdRef.current,
                      selection: bathymetrySelection,
                    });
                    bathymetrySelectionIdRef.current = cleared.selectionId;
                    setBathymetrySelection(cleared.selection);
                  }}
                >
                  ×
                </button>
              </div>
              <p>
                {bathymetrySelection.result.status === "loading"
                  ? "参考水深を取得中…"
                  : bathymetrySelection.result.status === "success"
                    ? `参考水深 ${bathymetrySelection.result.displayDepth}`
                    : bathymetrySelection.result.status === "land"
                      ? bathymetrySelection.result.displayDepth
                      : bathymetrySelection.result.message}
              </p>
              <span>
                緯度 {bathymetrySelection.lat.toFixed(5)} / 経度{" "}
                {bathymetrySelection.lon.toFixed(5)}
              </span>
              <span>
                {bathymetrySelectionConfig.label}（
                {bathymetrySelectionConfig.resolution}）
              </span>
            </div>
          ) : null}
          <div
            className="mapAttribution bathymetryAttribution"
            aria-label="水深・地形データの出典"
          >
            {fallbackActive
              ? BATHYMETRY_FALLBACK_ATTRIBUTION
              : BATHYMETRY_ATTRIBUTION}
            <span>
              {fallbackActive
                ? BATHYMETRY_FALLBACK_LICENSE_NOTE
                : BATHYMETRY_LICENSE_NOTE}
            </span>
          </div>
        </>
      ) : null}
      {fallbackActive && mapLayerMode === "bathymetry" ? (
        <div className="mapNotice" role="status">
          高解像度水深を読み込めなかったため、広域水深へ切り替えました
        </div>
      ) : null}
      {bathymetryRuntime.notice ? (
        <div className="mapNotice" role="status">
          {bathymetryRuntime.notice}
        </div>
      ) : null}
      {mapLayerMode === "aerial" ? (
        <div className="mapAttribution" aria-label="航空写真の出典">
          {GSI_AERIAL_TILE_ATTRIBUTION}
          <span>{GSI_AERIAL_TILE_NOTE}</span>
        </div>
      ) : null}
      {reports.length === 0 && mappableExternalMemos.length === 0 ? (
        <div className="mapEmpty" aria-hidden="true">
          <strong>表示できるマーカーはありません</strong>
          <span>条件を変更するか、フィルタをリセットしてください。</span>
        </div>
      ) : null}
    </div>
  );
}

function createPopupContent(report: FishingReport) {
  const popup = document.createElement("div");
  popup.className = "mapPopup";
  const spotName = document.createElement("strong");
  spotName.className = "mapPopupTitle";
  spotName.textContent = report.spotName;
  const summary = document.createElement("div");
  summary.className = "mapPopupSummary";
  const score = document.createElement("span");
  score.className = "mapPopupScore";
  score.textContent = `SCORE ${report.forecast.score}点`;
  const species = document.createElement("span");
  species.textContent = report.species;
  const place = document.createElement("span");
  place.textContent = report.areaName;
  summary.append(score, species, place);
  const method = document.createElement("p");
  method.className = "mapPopupMeta";
  method.textContent = `${report.method} / ${report.reportDate}`;
  const reason = document.createElement("p");
  reason.textContent = report.forecast.reasons[0] ?? "";
  popup.append(spotName, summary, method, reason);
  return popup;
}

async function loadBathymetryTileImageData(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`bathymetry-point-tile-${response.status}`);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("bathymetry-point-canvas");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function createExternalMemoPopupContent(memo: MappableExternalMemo) {
  const popup = document.createElement("div");
  popup.className = "mapPopup";
  const title = document.createElement("strong");
  title.className = "mapPopupTitle";
  title.textContent = memo.estimatedSpotName ?? memo.spotName;
  const summary = document.createElement("div");
  summary.className = "mapPopupSummary";
  const badge = document.createElement("span");
  badge.className = "mapPopupExternal";
  badge.textContent = "自分の釣果";
  const species = document.createElement("span");
  species.textContent = String(memo.species);
  const area = document.createElement("span");
  area.textContent = memo.areaName;
  summary.append(badge, species, area);
  const meta = document.createElement("p");
  meta.className = "mapPopupMeta";
  meta.textContent = `${memo.caughtDate} / ${memo.method} / ${memo.catchCount ?? "匹数未入力"}${memo.sizeCm ? ` / ${memo.sizeCm}cm` : ""}`;
  const note = document.createElement("p");
  note.textContent = [memo.estimatedSpotName ?? memo.spotName, memo.userMemo]
    .filter(Boolean)
    .join(" / ");
  popup.append(title, summary, meta, note);
  return popup;
}

function addPrimaryBathymetryLayers(map: maplibregl.Map) {
  if (!map.getSource(BATHYMETRY_SOURCE_ID)) {
    map.addSource(BATHYMETRY_SOURCE_ID, {
      type: "raster-dem",
      tiles: [BATHYMETRY_TILE_URL],
      tileSize: 256,
      minzoom: BATHYMETRY_MIN_ZOOM,
      maxzoom: BATHYMETRY_MAX_ZOOM,
      bounds: [...BATHYMETRY_BOUNDS],
      encoding: "mapbox",
      attribution: BATHYMETRY_ATTRIBUTION,
    });
  }
  if (!map.getSource(BATHYMETRY_COLOR_SOURCE_ID)) {
    map.addSource(BATHYMETRY_COLOR_SOURCE_ID, {
      type: "raster",
      tiles: [BATHYMETRY_COLOR_TILE_URL],
      tileSize: 256,
      minzoom: BATHYMETRY_MIN_ZOOM,
      maxzoom: BATHYMETRY_MAX_ZOOM,
      bounds: [...BATHYMETRY_BOUNDS],
      attribution: BATHYMETRY_ATTRIBUTION,
    });
  }
  if (!map.getSource(BATHYMETRY_CONTOUR_SOURCE_ID)) {
    map.addSource(BATHYMETRY_CONTOUR_SOURCE_ID, {
      type: "geojson",
      data: BATHYMETRY_CONTOUR_GEOJSON_URL,
    });
  }
  addBathymetryLayersForSources(map, {
    colorLayerId: BATHYMETRY_COLOR_LAYER_ID,
    colorSourceId: BATHYMETRY_COLOR_SOURCE_ID,
    hillshadeLayerId: BATHYMETRY_HILLSHADE_LAYER_ID,
    demSourceId: BATHYMETRY_SOURCE_ID,
    contourLayerId: BATHYMETRY_CONTOUR_LAYER_ID,
    contourLabelLayerId: BATHYMETRY_CONTOUR_LABEL_LAYER_ID,
    contourSourceId: BATHYMETRY_CONTOUR_SOURCE_ID,
    seaSurfaceLayerId: BATHYMETRY_SEA_SURFACE_LAYER_ID,
    hillshadeProfile: getBathymetryHillshadeProfile("gebco"),
  });
}

function addFallbackBathymetryLayers(map: maplibregl.Map) {
  if (!map.getSource(BATHYMETRY_FALLBACK_SOURCE_ID)) {
    map.addSource(BATHYMETRY_FALLBACK_SOURCE_ID, {
      type: "raster-dem",
      tiles: [BATHYMETRY_FALLBACK_TILE_URL],
      tileSize: 256,
      minzoom: BATHYMETRY_MIN_ZOOM,
      maxzoom: BATHYMETRY_MAX_ZOOM,
      bounds: [...BATHYMETRY_BOUNDS],
      encoding: "mapbox",
      attribution: BATHYMETRY_FALLBACK_ATTRIBUTION,
    });
  }
  if (!map.getSource(BATHYMETRY_FALLBACK_COLOR_SOURCE_ID)) {
    map.addSource(BATHYMETRY_FALLBACK_COLOR_SOURCE_ID, {
      type: "raster",
      tiles: [BATHYMETRY_FALLBACK_COLOR_TILE_URL],
      tileSize: 256,
      minzoom: BATHYMETRY_MIN_ZOOM,
      maxzoom: BATHYMETRY_MAX_ZOOM,
      bounds: [...BATHYMETRY_BOUNDS],
      attribution: BATHYMETRY_FALLBACK_ATTRIBUTION,
    });
  }
  if (!map.getSource(BATHYMETRY_FALLBACK_CONTOUR_SOURCE_ID)) {
    map.addSource(BATHYMETRY_FALLBACK_CONTOUR_SOURCE_ID, {
      type: "geojson",
      data: BATHYMETRY_FALLBACK_CONTOUR_GEOJSON_URL,
    });
  }
  addBathymetryLayersForSources(map, {
    colorLayerId: BATHYMETRY_FALLBACK_COLOR_LAYER_ID,
    colorSourceId: BATHYMETRY_FALLBACK_COLOR_SOURCE_ID,
    hillshadeLayerId: BATHYMETRY_FALLBACK_HILLSHADE_LAYER_ID,
    demSourceId: BATHYMETRY_FALLBACK_SOURCE_ID,
    contourLayerId: BATHYMETRY_FALLBACK_CONTOUR_LAYER_ID,
    contourLabelLayerId: BATHYMETRY_FALLBACK_CONTOUR_LABEL_LAYER_ID,
    contourSourceId: BATHYMETRY_FALLBACK_CONTOUR_SOURCE_ID,
    seaSurfaceLayerId: BATHYMETRY_FALLBACK_SEA_SURFACE_LAYER_ID,
    hillshadeProfile: getBathymetryHillshadeProfile("etopo"),
  });
}

type BathymetryLayerSources = {
  colorLayerId: string;
  colorSourceId: string;
  hillshadeLayerId: string;
  demSourceId: string;
  contourLayerId: string;
  contourLabelLayerId: string;
  contourSourceId: string;
  seaSurfaceLayerId: string;
  hillshadeProfile: ReturnType<typeof getBathymetryHillshadeProfile>;
};

function addBathymetryLayersForSources(
  map: maplibregl.Map,
  sources: BathymetryLayerSources,
) {
  const beforeId = firstSymbolLayerId(map);
  if (!map.getLayer(sources.colorLayerId)) {
    map.addLayer(
      {
        id: sources.colorLayerId,
        type: "raster",
        source: sources.colorSourceId,
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.62 },
      },
      beforeId,
    );
  }

  if (!map.getLayer(sources.seaSurfaceLayerId)) {
    map.addLayer(
      {
        id: sources.seaSurfaceLayerId,
        type: "raster",
        source: sources.colorSourceId,
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.18 },
      },
      beforeId,
    );
  }
  if (!map.getLayer(sources.hillshadeLayerId)) {
    map.addLayer(
      {
        id: sources.hillshadeLayerId,
        type: "hillshade",
        source: sources.demSourceId,
        layout: { visibility: "none" },
        paint: {
          "hillshade-shadow-color": sources.hillshadeProfile.shadowColor,
          "hillshade-highlight-color": sources.hillshadeProfile.highlightColor,
          "hillshade-accent-color": sources.hillshadeProfile.accentColor,
          "hillshade-exaggeration": sources.hillshadeProfile.exaggeration,
          "hillshade-illumination-direction": sources.hillshadeProfile.illuminationDirection,
          "hillshade-illumination-anchor": sources.hillshadeProfile.illuminationAnchor,
        },
      },
      beforeId,
    );
  }
  if (!map.getLayer(sources.contourLayerId)) {
    map.addLayer(
      {
        id: sources.contourLayerId,
        type: "line",
        source: sources.contourSourceId,
        layout: { visibility: "none" },
        paint: {
          "line-color": "#dffbff",
          "line-opacity": 0.72,
          "line-width": ["case", ["==", ["get", "major"], true], 1.4, 0.7],
        },
      },
      beforeId,
    );
  }
  if (!map.getLayer(sources.contourLabelLayerId)) {
    map.addLayer({
      id: sources.contourLabelLayerId,
      type: "symbol",
      minzoom: 8,
      source: sources.contourSourceId,
      layout: {
        visibility: "none",
        "symbol-placement": "line",
        "text-field": [
          "format",
          ["get", "depth"],
          { "font-scale": 0.9 },
          "m",
          {},
        ],
        "text-size": 11,
      },
      paint: {
        "text-color": "#e0faff",
        "text-halo-color": "#082f49",
        "text-halo-width": 1.2,
      },
    });
  }
}

function removeBathymetryRuntimeLayers(map: maplibregl.Map) {
  map.setTerrain(null);
  const layers = [
    ...PRIMARY_LAYER_IDS.slice().reverse(),
    ...FALLBACK_LAYER_IDS.slice().reverse(),
  ];
  for (const layerId of layers) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  const sources = [
    BATHYMETRY_CONTOUR_SOURCE_ID,
    BATHYMETRY_COLOR_SOURCE_ID,
    BATHYMETRY_SOURCE_ID,
    BATHYMETRY_FALLBACK_CONTOUR_SOURCE_ID,
    BATHYMETRY_FALLBACK_COLOR_SOURCE_ID,
    BATHYMETRY_FALLBACK_SOURCE_ID,
  ];
  for (const sourceId of sources) {
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  }
}

function scoreColor(score: number) {
  if (score >= 70) return "#f97316";
  if (score >= 60) return "#0ea5e9";
  return "#64748b";
}

function fitMapToPoints(
  map: maplibregl.Map,
  reports: { latitude: number; longitude: number }[],
  hasAdjustedBounds: boolean,
) {
  if (reports.length === 1) {
    const [report] = reports;
    map.easeTo({
      center: [report.longitude, report.latitude],
      zoom: Math.min(Math.max(map.getZoom(), 12.5), 13),
      duration: hasAdjustedBounds ? 700 : 0,
      essential: true,
    });
    return;
  }

  const bounds = reports.reduce(
    (nextBounds, report) =>
      nextBounds.extend([report.longitude, report.latitude]),
    new maplibregl.LngLatBounds(
      [reports[0].longitude, reports[0].latitude],
      [reports[0].longitude, reports[0].latitude],
    ),
  );
  const containerWidth = map.getContainer().clientWidth;
  const padding =
    containerWidth < 640
      ? { top: 56, bottom: 56, left: 32, right: 32 }
      : { top: 72, bottom: 72, left: 88, right: 88 };
  map.fitBounds(bounds, {
    padding,
    maxZoom: hasAdjustedBounds ? 12 : 10.5,
    duration: hasAdjustedBounds ? 700 : 0,
    essential: true,
  });
}

const GSI_AERIAL_TILE_LAYERS = [
  {
    id: "gsi-modis",
    tiles: ["https://cyberjapandata.gsi.go.jp/xyz/modis/{z}/{x}/{y}.png"],
    minzoom: 2,
    maxzoom: 8,
    opacity: 0.95,
  },
  {
    id: "gsi-lndst",
    tiles: ["https://cyberjapandata.gsi.go.jp/xyz/lndst/{z}/{x}/{y}.png"],
    minzoom: 8,
    maxzoom: 14,
    opacity: 0.92,
  },
  {
    id: "gsi-seamless-photo",
    tiles: [
      "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
    ],
    minzoom: 14,
    maxzoom: 18,
    opacity: 0.92,
  },
] as const;

function addAerialPhotoLayer(map: maplibregl.Map | null) {
  if (!map) return;
  for (const layer of GSI_AERIAL_TILE_LAYERS) {
    if (!map.getSource(layer.id)) {
      map.addSource(layer.id, {
        type: "raster",
        tiles: [...layer.tiles],
        tileSize: 256,
        minzoom: layer.minzoom,
        maxzoom: layer.maxzoom,
        attribution: GSI_AERIAL_TILE_ATTRIBUTION,
      });
    }
    if (!map.getLayer(layer.id)) {
      map.addLayer(
        {
          id: layer.id,
          type: "raster",
          source: layer.id,
          minzoom: layer.minzoom,
          maxzoom: layer.maxzoom,
          layout: { visibility: "none" },
          paint: { "raster-opacity": layer.opacity },
        },
        firstSymbolLayerId(map),
      );
    }
  }
}

function setAerialLayerVisibility(map: maplibregl.Map, isVisible: boolean) {
  if (GSI_AERIAL_TILE_LAYERS.some((layer) => !map.getLayer(layer.id))) {
    addAerialPhotoLayer(map);
  }
  for (const layer of GSI_AERIAL_TILE_LAYERS) {
    if (map.getLayer(layer.id)) {
      map.setLayoutProperty(
        layer.id,
        "visibility",
        isVisible ? "visible" : "none",
      );
    }
  }
}

function firstSymbolLayerId(map: maplibregl.Map) {
  return map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
}
