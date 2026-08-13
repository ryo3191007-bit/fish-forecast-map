"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FishingSpot } from "@/domain/fishingSpot";
import type { FishingShop } from "@/domain/fishingShop";
import { fishingShops } from "@/data/fishingShops";
import { getFishingSpotPopupCaution } from "@/data/fishingSpots";
import { toFishingSpotMapEntry } from "@/domain/fishingSpotPresentation";
import {
  MAP_MARKER_LEGEND,
  mapMarkerIconSvg,
  markerKindForSpot,
  type MapMarkerKind,
} from "@/domain/mapMarkerPresentation";
import { legacySpeciesLabel, type FishSpeciesName } from "@/domain/fishing";
import type { ExternalCatchMemo } from "@/lib/externalCatchMemoStorage";
import {
  GSI_AERIAL_TILE_ATTRIBUTION,
  GSI_TILE_ATTRIBUTION,
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
  BATHYMETRY_FALLBACK_ATTRIBUTION,
  BATHYMETRY_FALLBACK_COLOR_LAYER_ID,
  BATHYMETRY_FALLBACK_COLOR_SOURCE_ID,
  BATHYMETRY_FALLBACK_COLOR_TILE_URL,
  BATHYMETRY_FALLBACK_CONTOUR_GEOJSON_URL,
  BATHYMETRY_FALLBACK_CONTOUR_LABEL_LAYER_ID,
  BATHYMETRY_FALLBACK_CONTOUR_LAYER_ID,
  BATHYMETRY_FALLBACK_CONTOUR_SOURCE_ID,
  BATHYMETRY_FALLBACK_HILLSHADE_LAYER_ID,
  BATHYMETRY_FALLBACK_METADATA_URL,
  BATHYMETRY_FALLBACK_SEA_SURFACE_LAYER_ID,
  BATHYMETRY_FALLBACK_SOURCE_ID,
  BATHYMETRY_FALLBACK_TILE_URL,
  BATHYMETRY_HILLSHADE_LAYER_ID,
  BATHYMETRY_MAX_ZOOM,
  BATHYMETRY_METADATA_URL,
  BATHYMETRY_MIN_ZOOM,
  BATHYMETRY_SEA_SURFACE_LAYER_ID,
  BATHYMETRY_SOURCE_ID,
  BATHYMETRY_TILE_URL,
  BATHYMETRY_EXAGGERATION_DEFAULT,
  BATHYMETRY_VIEW_PRESETS,
  classifyDeviceCapability,
  type DeviceCapabilityClass,
  type TerrainStatus,
} from "@/domain/bathymetry";
import {
  classifyBathymetryError,
  initialBathymetryFallbackState,
  reduceBathymetryFallback,
  validateBathymetryMetadata,
} from "@/domain/bathymetryFallback";
import {
  applyBathymetryContourFilters,
  applyBathymetryMode,
  getBathymetryHillshadeProfile,
  clearBathymetryCameraTransition,
  createBathymetryCameraTransitionManager,
  getDefaultBathymetryViewPreset,
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
import { requestCurrentLocation, type CurrentLocation } from "@/domain/geolocation";

type FishingMapProps = {
  externalMemos: ExternalCatchMemo[];
  spots: FishingSpot[];
  focusRequest: MapFocusRequest | null;
  onOpenSpotEvaluation: (spotId: string) => void;
  currentLocation: CurrentLocation | null;
  onCurrentLocationChange: (location: CurrentLocation) => void;
  environmentMatchSpotIds: Set<string> | null;
};

export type MapFocusRequest = { spotId: string; requestId: number };

type MappableExternalMemo = ExternalCatchMemo & {
  latitude: number;
  longitude: number;
  spotName: string;
};

type BathymetryViewPresetId = (typeof BATHYMETRY_VIEW_PRESETS)[number]["id"];


type BathymetrySelection = {
  id: number;
  lon: number;
  lat: number;
  source: BathymetryLookupSource;
  result: BathymetryPointResult | { status: "loading" };
};

const INITIAL_MARKER_FILTERS: Record<MapMarkerKind, boolean> = {
  port: true,
  rock: true,
  surf: true,
  place: true,
  catch: true,
  shop: true,
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

export function FishingMap({ externalMemos, spots, focusRequest, onOpenSpotEvaluation, currentLocation, onCurrentLocationChange, environmentMatchSpotIds }: FishingMapProps) {
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
  const currentLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const spotMarkersRef = useRef(new Map<string, maplibregl.Marker>());
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const focusedSpotIdRef = useRef<string | null>(null);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const [mapLayerMode, setMapLayerMode] = useState<MapLayerMode>("standard");
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
  const [isMarkerFilterSheetOpen, setIsMarkerFilterSheetOpen] = useState(false);
  const [markerFilters, setMarkerFilters] = useState(INITIAL_MARKER_FILTERS);
  const [isTerrainEnabled, setIsTerrainEnabled] = useState(false);
  const [terrainExaggeration] = useState(
    BATHYMETRY_EXAGGERATION_DEFAULT,
  );
  const hillshadeEnabled = true;
  const contoursEnabled = true;
  const [, setSelectedViewPreset] = useState<BathymetryViewPresetId | null>(null);
  const [, setTerrainStatus] = useState<TerrainStatus>("2d");
  const [deviceCapability, setDeviceCapability] =
    useState<DeviceCapabilityClass | null>(null);
  const [bathymetryRuntime, setBathymetryRuntime] = useState(
    initialBathymetryFallbackState,
  );
  const previousBathymetryPointModeRef = useRef(mapLayerMode);
  const previousBathymetryPointDisplayRef = useRef(bathymetryRuntime.display);
  const [bathymetrySelection, setBathymetrySelection] =
    useState<BathymetrySelection | null>(null);
  const [locationPending, setLocationPending] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "gsi-pale": {
            type: "raster",
            tiles: ["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 18,
            attribution: GSI_TILE_ATTRIBUTION,
          },
        },
        layers: [
          {
            id: "gsi-pale",
            type: "raster",
            source: "gsi-pale",
          },
        ],
      },
      center: [129.95, 33.48],
      zoom: 8.2,
      attributionControl: false,
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
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    return () => {
      map.off("load", onLoad);
      map.off("error", onError);
      activePopupRef.current?.remove();
      activePopupRef.current = null;
      currentLocationMarkerRef.current?.remove();
      currentLocationMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentLocation) return;
    const point: [number, number] = [currentLocation.longitude, currentLocation.latitude];
    if (!currentLocationMarkerRef.current) {
      const element = document.createElement("div");
      element.className = "currentLocationMarker";
      element.setAttribute("aria-label", "現在地");
      currentLocationMarkerRef.current = new maplibregl.Marker({ element }).setLngLat(point).addTo(map);
    } else currentLocationMarkerRef.current.setLngLat(point);
  }, [currentLocation]);

  const locateUser = async () => {
    if (locationPending) return;
    setLocationPending(true); setLocationMessage(null);
    try {
      const location = await requestCurrentLocation();
      onCurrentLocationChange(location);
      const map = mapRef.current;
      map?.easeTo({ center: [location.longitude, location.latitude], zoom: Math.max(map.getZoom(), 14), duration: 700 });
    } catch (error) { setLocationMessage(error instanceof Error ? error.message : "現在地を取得できませんでした。"); }
    finally { setLocationPending(false); }
  };

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
    const markerPoints = [...spots, ...mappableExternalMemos, ...fishingShops];
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
  }, [mappableExternalMemos, spots]);

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
    const spotMarkerRegistry = spotMarkersRef.current;

    const registerPopup = (popup: maplibregl.Popup) => {
      popup.on("open", () => {
        if (activePopupRef.current !== popup) activePopupRef.current?.remove();
        activePopupRef.current = popup;
      });
      popup.on("close", () => {
        if (activePopupRef.current === popup) activePopupRef.current = null;
      });
      return popup;
    };

    const spotMarkers = spots.map((sourceSpot) => {
      const { spot, coordinates } = toFishingSpotMapEntry(sourceSpot);
      const element = document.createElement("button");
      element.type = "button";
      const markerKind = markerKindForSpot(spot);
      element.className = "mapIconMarker fishingSpotMarker";
      if (environmentMatchSpotIds) element.classList.add(environmentMatchSpotIds.has(spot.id) ? "environmentMatch" : "environmentNonMatch");
      element.dataset.markerKind = markerKind;
      element.setAttribute("aria-label", `${spot.name}（${spot.spotType}）の地点`);
      element.innerHTML = `<span class="mapIconMarkerPin mapIconMarker--${markerKind}">${mapMarkerIconSvg(markerKind)}</span>`;
      const popup = registerPopup(
        new maplibregl.Popup({ offset: 18, maxWidth: "min(220px, calc(100vw - 24px))" }),
      );
      popup.setDOMContent(createSpotPopupContent(spot, () => {
        onOpenSpotEvaluation(spot.id);
        popup.remove();
      }));
      const marker = new maplibregl.Marker({ element })
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(map);
      spotMarkerRegistry.set(spot.id, marker);
      return marker;
    });

    const memoMarkers = mappableExternalMemos.map((memo) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "mapIconMarker catchMarker";
      element.dataset.markerKind = "catch";
      element.setAttribute("aria-label", `${memo.spotName}の登録済み釣果`);
      element.innerHTML = `<span class="mapIconMarkerPin mapIconMarker--catch">${mapMarkerIconSvg("catch")}</span>`;
      return new maplibregl.Marker({ element })
        .setLngLat([memo.longitude, memo.latitude])
        .setPopup(
          registerPopup(new maplibregl.Popup({ offset: 16, maxWidth: "min(300px, calc(100vw - 32px))" }).setDOMContent(
            createExternalMemoPopupContent(memo),
          )),
        )
        .addTo(map);
    });

    const shopMarkers = fishingShops.map((shop) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "mapIconMarker fishingShopMarker";
      element.dataset.markerKind = "shop";
      element.setAttribute("aria-label", `${shop.name}の店舗情報`);
      element.innerHTML = `<span class="mapIconMarkerPin mapIconMarker--shop">${mapMarkerIconSvg("shop")}</span>`;
      return new maplibregl.Marker({ element })
        .setLngLat([shop.longitude, shop.latitude])
        .setPopup(registerPopup(new maplibregl.Popup({ offset: 18, maxWidth: "min(300px, calc(100vw - 32px))" })
          .setDOMContent(createFishingShopPopupContent(shop))))
        .addTo(map);
    });

    return () => {
      activePopupRef.current?.remove();
      activePopupRef.current = null;
      focusedSpotIdRef.current = null;
      spotMarkerRegistry.clear();
      [...spotMarkers, ...memoMarkers, ...shopMarkers].forEach((marker) => marker.remove());
    };
  }, [environmentMatchSpotIds, mappableExternalMemos, onOpenSpotEvaluation, spots]);

  useEffect(() => {
    if (!focusRequest) return;
    const map = mapRef.current;
    const marker = spotMarkersRef.current.get(focusRequest.spotId);
    const spot = spots.find((item) => item.id === focusRequest.spotId);
    if (!map || !marker || !spot) return;

    if (focusedSpotIdRef.current) {
      spotMarkersRef.current.get(focusedSpotIdRef.current)?.getElement().classList.remove("focused");
    }
    marker.getElement().classList.add("focused");
    focusedSpotIdRef.current = spot.id;
    activePopupRef.current?.remove();
    marker.getPopup()?.remove();
    marker.togglePopup();
    map.easeTo({ center: [spot.longitude, spot.latitude], zoom: Math.max(map.getZoom(), 13), duration: 700 });
  }, [focusRequest, spots]);

  const handleLayerModeChange = (nextMode: MapLayerMode) => {
    if (nextMode === "bathymetry") {
      setBathymetryRuntime((current) =>
        reduceBathymetryFallback(current, { type: "enter-bathymetry" }),
      );
    }
    setMapLayerMode(nextMode);
  };

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

  const fallbackActive = bathymetryRuntime.display === "etopo";
  const enabledMarkerFilterCount = MAP_MARKER_LEGEND.filter(
    ({ kind }) => markerFilters[kind],
  ).length;
  const bathymetrySelectionConfig = bathymetrySelection
    ? getBathymetryPointTileConfig(bathymetrySelection.source)
    : null;

  return (
    <div className="mapFrame">
      <MapLayerToggle value={mapLayerMode} onChange={handleLayerModeChange} />
      <div className="mapShell">
      <div
        ref={mapViewportRef}
        className={`mapViewport ${MAP_MARKER_LEGEND.filter(({ kind }) => !markerFilters[kind]).map(({ kind }) => `markerKindHidden--${kind}`).join(" ")}`}
      >
        <div ref={containerRef} className="map" aria-label="釣果地点マップ" />
        <div className="mapActionControls">
          <button type="button" className="mapMenuButton" aria-label="マップ操作メニュー" aria-expanded={isMapMenuOpen} onClick={() => setIsMapMenuOpen((current) => !current)}>
            <span aria-hidden="true">☰</span>
          </button>
          {isMapMenuOpen ? (
            <div className="mapMenuItems" aria-label="マップ操作">
              <button type="button" aria-label="ズームイン" onClick={() => mapRef.current?.zoomIn()}>＋</button>
              <button type="button" aria-label="ズームアウト" onClick={() => mapRef.current?.zoomOut()}>－</button>
            </div>
          ) : null}
          <button type="button" className={`currentLocationMapButton${locationPending ? " isPending" : ""}`} aria-label="現在地を表示" title="現在地を表示" aria-busy={locationPending} disabled={locationPending} onClick={() => void locateUser()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
            <span className="currentLocationSpinner" aria-hidden="true" />
          </button>
          {(locationPending || locationMessage) && (
            <p className="currentLocationStatus" role="status">
              {locationPending ? "現在地を取得中です" : locationMessage}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        className="mapFilterButton"
        aria-label={`表示フィルター ${enabledMarkerFilterCount}/${MAP_MARKER_LEGEND.length}`}
        aria-expanded={isMarkerFilterSheetOpen}
        aria-controls="map-filter-sheet"
        onClick={() => setIsMarkerFilterSheetOpen(true)}
      >
        <svg className="mapFilterButtonIcon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 5h4m4 0h6M3 10h8m4 0h2M3 15h2m4 0h8" />
          <circle cx="9" cy="5" r="2" />
          <circle cx="13" cy="10" r="2" />
          <circle cx="7" cy="15" r="2" />
        </svg>
        表示 {enabledMarkerFilterCount}/{MAP_MARKER_LEGEND.length}
      </button>
      <div className="mapBottomOverlays">
        {mapLayerMode === "bathymetry" ? (
          <>
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
          </>
        ) : null}
      </div>
      {isMarkerFilterSheetOpen ? (
        <section
          id="map-filter-sheet"
          className="mapFilterSheet"
          role="dialog"
          aria-modal="false"
          aria-labelledby="map-filter-sheet-title"
          aria-describedby="map-filter-sheet-description"
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsMarkerFilterSheetOpen(false);
          }}
        >
          <div className="mapFilterSheetHandle" aria-hidden="true" />
          <div className="mapFilterSheetHeading">
            <div>
              <h3 id="map-filter-sheet-title">表示フィルター</h3>
              <p id="map-filter-sheet-description">地図に表示する項目を選択</p>
            </div>
          </div>
          <div className="mapFilterOptions">
            {MAP_MARKER_LEGEND.map(({ kind, label }) => (
              <label key={kind} className="mapFilterOption">
                <i className={`mapLegendIcon mapIconMarker--${kind}`} dangerouslySetInnerHTML={{ __html: mapMarkerIconSvg(kind) }} />
                <span>{label}</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={`${label}を表示`}
                  checked={markerFilters[kind]}
                  onChange={(event) => setMarkerFilters((current) => ({ ...current, [kind]: event.target.checked }))}
                />
              </label>
            ))}
          </div>
          <div className="mapFilterActions">
            <button type="button" className="mapFilterShowAll" onClick={() => setMarkerFilters(INITIAL_MARKER_FILTERS)}>
              すべて表示
            </button>
            <button type="button" className="mapFilterClose" onClick={() => setIsMarkerFilterSheetOpen(false)} autoFocus>
              閉じる
            </button>
          </div>
        </section>
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
      {spots.length === 0 && mappableExternalMemos.length === 0 && fishingShops.length === 0 ? (
        <div className="mapEmpty" aria-hidden="true">
          <strong>表示できるマーカーはありません</strong>
          <span>条件を変更するか、フィルタをリセットしてください。</span>
        </div>
      ) : null}
      </div>
    </div>
  );
}

function createSpotPopupContent(spot: FishingSpot, onOpenSpotEvaluation: () => void) {
  const popup = document.createElement("div");
  popup.className = "mapPopup mapSpotPopup";
  const title = document.createElement("strong");
  title.className = "mapPopupTitle";
  title.textContent = spot.name;
  const cautionText = getFishingSpotPopupCaution(spot);
  const caution = document.createElement("p");
  caution.className = "mapSpotPopupCaution";
  caution.textContent = cautionText;
  const evaluationButton = document.createElement("button");
  evaluationButton.type = "button";
  evaluationButton.className = "mapSpotEvaluationButton";
  evaluationButton.textContent = "地点情報";
  evaluationButton.addEventListener("click", onOpenSpotEvaluation);
  popup.append(title);
  if (cautionText) popup.append(caution);
  popup.append(evaluationButton);
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
  species.textContent = memo.catchItems.map((item) => legacySpeciesLabel(item.species as FishSpeciesName)).join("・");
  const area = document.createElement("span");
  area.textContent = memo.areaName;
  summary.append(badge, species, area);
  const meta = document.createElement("p");
  meta.className = "mapPopupMeta";
  meta.textContent = `${memo.caughtDate} / ${memo.catchItems.map((item) => `${legacySpeciesLabel(item.species as FishSpeciesName)}${item.method ? `（${item.method}）` : ""}${item.catchCount === undefined ? "" : ` ${item.catchCount}匹`}${item.sizeCm === undefined ? "" : ` / ${item.sizeCm}cm`}`).join("、")}`;
  const note = document.createElement("p");
  note.textContent = [memo.estimatedSpotName ?? memo.spotName, memo.userMemo]
    .filter(Boolean)
    .join(" / ");
  popup.append(title, summary, meta, note);
  return popup;
}

function createFishingShopPopupContent(shop: FishingShop) {
  const popup = document.createElement("div");
  popup.className = "mapPopup mapShopPopup";
  const title = document.createElement("strong");
  title.className = "mapPopupTitle";
  title.textContent = shop.name;
  popup.append(title);
  for (const value of [shop.address, shop.phone ? `電話: ${shop.phone}` : undefined, shop.openingHours]) {
    if (!value) continue;
    const detail = document.createElement("p");
    detail.textContent = value;
    popup.append(detail);
  }
  if (shop.openingHours) {
    const checked = document.createElement("small");
    checked.className = "mapPopupCheckedAt";
    checked.textContent = `営業時間確認日: ${shop.openingHoursCheckedAt ?? shop.checkedAt}`;
    popup.append(checked);
  }
  if (shop.officialUrl) {
    const link = document.createElement("a");
    link.className = "mapShopOfficialLink";
    link.href = shop.officialUrl;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = "公式店舗ページを確認";
    popup.append(link);
  }
  const coordinateNote = document.createElement("small");
  coordinateNote.className = "mapPopupCheckedAt";
  coordinateNote.textContent = `店舗位置は建物・敷地の代表点 / 情報確認日: ${shop.checkedAt}`;
  popup.append(coordinateNote);
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

function fitMapToPoints(
  map: maplibregl.Map,
  points: { latitude: number; longitude: number }[],
  hasAdjustedBounds: boolean,
) {
  if (points.length === 1) {
    const [point] = points;
    map.easeTo({
      center: [point.longitude, point.latitude],
      zoom: Math.min(Math.max(map.getZoom(), 12.5), 13),
      duration: hasAdjustedBounds ? 700 : 0,
      essential: true,
    });
    return;
  }

  const bounds = points.reduce(
    (nextBounds, point) =>
      nextBounds.extend([point.longitude, point.latitude]),
    new maplibregl.LngLatBounds(
      [points[0].longitude, points[0].latitude],
      [points[0].longitude, points[0].latitude],
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
