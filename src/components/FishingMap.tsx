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
  BATHYMETRY_FALLBACK_SOURCE_ID,
  BATHYMETRY_FALLBACK_TILE_URL,
  BATHYMETRY_HILLSHADE_LAYER_ID,
  BATHYMETRY_LICENSE_NOTE,
  BATHYMETRY_MAX_ZOOM,
  BATHYMETRY_METADATA_URL,
  BATHYMETRY_MIN_ZOOM,
  BATHYMETRY_SAFETY_NOTE,
  BATHYMETRY_SOURCE_ID,
  BATHYMETRY_TILE_URL,
  BATHYMETRY_COASTLINE_ATTRIBUTION,
  BATHYMETRY_COASTLINE_GEOJSON_URL,
  BATHYMETRY_COASTLINE_LAYER_ID,
  BATHYMETRY_COASTLINE_NOTE,
  BATHYMETRY_COASTLINE_SOURCE_ID,
  BATHYMETRY_LAND_MASK_LAYER_ID,
  BATHYMETRY_LAND_MASK_OPACITY,
  lonLatToTidCell,
  shouldEnableInitialCoastlineOverlay,
  shouldEnableInitialTerrain,
  summarizeTidAround,
  type TidSummary,
} from "@/domain/bathymetry";
import {
  classifyBathymetryError,
  initialBathymetryFallbackState,
  reduceBathymetryFallback,
  validateBathymetryMetadata,
  type BathymetryFailureSource,
  type BathymetryDisplaySource,
} from "@/domain/bathymetryFallback";
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

type TerrainStatus = "3d" | "2d" | "unsupported" | "error";

type TidGrid = {
  values: number[];
  width: number;
  height: number;
  nodata: number;
};

const PRIMARY_LAYER_IDS = [
  BATHYMETRY_COLOR_LAYER_ID,
  BATHYMETRY_HILLSHADE_LAYER_ID,
  BATHYMETRY_CONTOUR_LAYER_ID,
  BATHYMETRY_CONTOUR_LABEL_LAYER_ID,
] as const;

const FALLBACK_LAYER_IDS = [
  BATHYMETRY_FALLBACK_COLOR_LAYER_ID,
  BATHYMETRY_FALLBACK_HILLSHADE_LAYER_ID,
  BATHYMETRY_FALLBACK_CONTOUR_LAYER_ID,
  BATHYMETRY_FALLBACK_CONTOUR_LABEL_LAYER_ID,
] as const;

const HIDDEN_BASE_LAND_LAYER_VISIBILITY = new WeakMap<
  maplibregl.Map,
  Map<string, "visible" | "none" | undefined>
>();

export function FishingMap({ reports, externalMemos, spots }: FishingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasAdjustedBoundsRef = useRef(false);
  const [mapLayerMode, setMapLayerMode] = useState<MapLayerMode>("standard");
  const [isTerrainEnabled, setIsTerrainEnabled] = useState(false);
  const [terrainStatus, setTerrainStatus] = useState<TerrainStatus>("2d");
  const [bathymetryRuntime, setBathymetryRuntime] = useState(
    initialBathymetryFallbackState,
  );
  const [isCoastlineOverlayEnabled, setIsCoastlineOverlayEnabled] = useState(false);
  const [tidExpanded, setTidExpanded] = useState(false);
  const [tidGrid, setTidGrid] = useState<TidGrid | null>(null);
  const [tidSummary, setTidSummary] = useState<TidSummary | null>(null);
  const [tidStatus, setTidStatus] = useState("TID正本を読み込み中です");

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
        if (!response.ok) throw new Error(`TID fetch failed: ${response.status}`);
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
    const enabled = shouldEnableInitialTerrain({
      width: window.innerWidth,
      prefersReducedMotion,
      deviceMemory,
      webglAvailable: supportsWebGl,
    });
    setIsTerrainEnabled(enabled);
    setTerrainStatus(enabled ? "3d" : supportsWebGl ? "2d" : "unsupported");
    setIsCoastlineOverlayEnabled(shouldEnableInitialCoastlineOverlay(window.innerWidth));
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
        const message = error instanceof Error ? error.message : "metadata-error";
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
      applyBathymetryMode({
        map,
        mode: mapLayerMode,
        display: bathymetryRuntime.display,
        terrainEnabled: isTerrainEnabled,
        coastlineOverlayEnabled: isCoastlineOverlayEnabled,
        setTerrainStatus,
        onSourceError: (source, key) =>
          setBathymetryRuntime((current) =>
            reduceBathymetryFallback(current, {
              type: "source-error",
              source,
              key,
            }),
          ),
      });
    };

    if (map.loaded()) applyLayerMode();
    else map.once("load", applyLayerMode);
    return () => {
      map.off("load", applyLayerMode);
    };
  }, [
    bathymetryRuntime.display,
    isCoastlineOverlayEnabled,
    isTerrainEnabled,
    mapLayerMode,
  ]);

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

  const fallbackActive = bathymetryRuntime.display === "etopo";

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
                disabled={terrainStatus === "unsupported"}
                onChange={(event) => setIsTerrainEnabled(event.target.checked)}
              />
              3D表示
            </label>
            <button
              className="terrainToggleButton"
              type="button"
              aria-pressed={isCoastlineOverlayEnabled}
              title="海岸線ラインと緑の陸地マスクを切り替え"
              onClick={() => setIsCoastlineOverlayEnabled((value) => !value)}
            >
              海岸線表示
            </button>
            <button
              className="terrainToggleButton"
              type="button"
              aria-expanded={tidExpanded}
              title="GEBCO TID Gridのデータ由来を表示"
              onClick={() => setTidExpanded((value) => !value)}
            >
              データ由来
            </button>
            <span className="terrainStatus">
              {terrainStatus === "3d"
                ? "3D地形表示"
                : terrainStatus === "error"
                  ? "3D初期化失敗"
                  : terrainStatus === "unsupported"
                    ? "この端末では2D表示"
                    : "2D軽量表示"}
            </span>
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
            <div className="bathymetryLegend" aria-label="水深凡例">
              {BATHYMETRY_DEPTH_STOPS.map((stop) => (
                <span key={stop.label}>
                  <i style={{ background: stop.color }} />
                  {stop.label}
                </span>
              ))}
            </div>
          </div>
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
            <span>{BATHYMETRY_SAFETY_NOTE}</span>
            {isCoastlineOverlayEnabled ? (
              <span>
                <span
                  dangerouslySetInnerHTML={{ __html: BATHYMETRY_COASTLINE_ATTRIBUTION }}
                />
                {` / ${BATHYMETRY_COASTLINE_NOTE}`}
              </span>
            ) : null}
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

type ApplyBathymetryModeInput = {
  map: maplibregl.Map;
  mode: MapLayerMode;
  display: BathymetryDisplaySource;
  terrainEnabled: boolean;
  coastlineOverlayEnabled: boolean;
  setTerrainStatus: (status: TerrainStatus) => void;
  onSourceError: (source: BathymetryFailureSource, key: string) => void;
};

function applyBathymetryMode({
  map,
  mode,
  display,
  terrainEnabled,
  coastlineOverlayEnabled,
  setTerrainStatus,
  onSourceError,
}: ApplyBathymetryModeInput) {
  if (mode !== "bathymetry" || display === "standard") {
    restoreBaseLandLayerVisibility(map);
    removeBathymetryRuntimeLayers(map);
    setTerrainStatus("2d");
    return;
  }

  if (display === "gebco") addPrimaryBathymetryLayers(map);
  else addFallbackBathymetryLayers(map);
  if (coastlineOverlayEnabled) ensureCoastlineOverlay(map);

  for (const layerId of PRIMARY_LAYER_IDS) {
    setLayerVisibility(map, layerId, display === "gebco");
  }
  for (const layerId of FALLBACK_LAYER_IDS) {
    setLayerVisibility(map, layerId, display === "etopo");
  }
  setLayerVisibility(
    map,
    BATHYMETRY_LAND_MASK_LAYER_ID,
    coastlineOverlayEnabled,
  );
  setLayerVisibility(
    map,
    BATHYMETRY_COASTLINE_LAYER_ID,
    coastlineOverlayEnabled,
  );
  if (coastlineOverlayEnabled) hideBaseLandLayersForBathymetryCoastline(map);
  else restoreBaseLandLayerVisibility(map);

  try {
    if (terrainEnabled) {
      const source =
        display === "gebco"
          ? BATHYMETRY_SOURCE_ID
          : BATHYMETRY_FALLBACK_SOURCE_ID;
      map.setTerrain({ source, exaggeration: 1 });
      map.easeTo({ pitch: 52, bearing: -18, duration: 650, essential: false });
      setTerrainStatus("3d");
    } else {
      map.setTerrain(null);
      map.easeTo({ pitch: 0, bearing: 0, duration: 350, essential: false });
      setTerrainStatus("2d");
    }
  } catch (error) {
    map.setTerrain(null);
    setTerrainStatus("error");
    const message = error instanceof Error ? error.message : "terrain-init";
    onSourceError(display, `terrain-init:${message}`);
  }
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
    hillshadeExaggeration: 0.28,
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
    hillshadeExaggeration: 0.24,
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
  hillshadeExaggeration: number;
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
  if (!map.getLayer(sources.hillshadeLayerId)) {
    map.addLayer(
      {
        id: sources.hillshadeLayerId,
        type: "hillshade",
        source: sources.demSourceId,
        layout: { visibility: "none" },
        paint: {
          "hillshade-shadow-color": "#082f49",
          "hillshade-highlight-color": "#dffbff",
          "hillshade-accent-color": "#0ea5e9",
          "hillshade-exaggeration": sources.hillshadeExaggeration,
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
          "line-width": [
            "case",
            ["==", ["get", "major"], true],
            1.4,
            0.7,
          ],
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

function ensureCoastlineOverlay(map: maplibregl.Map) {
  if (!map.getSource(BATHYMETRY_COASTLINE_SOURCE_ID)) {
    map.addSource(BATHYMETRY_COASTLINE_SOURCE_ID, {
      type: "geojson",
      data: BATHYMETRY_COASTLINE_GEOJSON_URL,
      attribution: BATHYMETRY_COASTLINE_ATTRIBUTION,
    });
  }
  const beforeId = firstSymbolLayerId(map);
  if (!map.getLayer(BATHYMETRY_LAND_MASK_LAYER_ID)) {
    map.addLayer(
      {
        id: BATHYMETRY_LAND_MASK_LAYER_ID,
        type: "fill",
        source: BATHYMETRY_COASTLINE_SOURCE_ID,
        filter: ["==", ["geometry-type"], "Polygon"],
        layout: { visibility: "none" },
        paint: {
          "fill-color": "#5f8f5a",
          "fill-opacity": BATHYMETRY_LAND_MASK_OPACITY,
        },
      },
      beforeId,
    );
  }
  if (!map.getLayer(BATHYMETRY_COASTLINE_LAYER_ID)) {
    map.addLayer(
      {
        id: BATHYMETRY_COASTLINE_LAYER_ID,
        type: "line",
        source: BATHYMETRY_COASTLINE_SOURCE_ID,
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { visibility: "none", "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#064e3b",
          "line-opacity": 0.92,
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.2, 10, 2.2, 13, 3],
        },
      },
      beforeId,
    );
  }
}

function setLayerVisibility(
  map: maplibregl.Map,
  layerId: string,
  visible: boolean,
) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}

function hideBaseLandLayersForBathymetryCoastline(map: maplibregl.Map) {
  const store =
    HIDDEN_BASE_LAND_LAYER_VISIBILITY.get(map) ??
    new Map<string, "visible" | "none" | undefined>();
  HIDDEN_BASE_LAND_LAYER_VISIBILITY.set(map, store);

  for (const layer of map.getStyle().layers ?? []) {
    if (!isBaseMapLandColorLayer(layer)) continue;
    if (!map.getLayer(layer.id)) continue;
    if (!store.has(layer.id)) {
      store.set(
        layer.id,
        map.getLayoutProperty(layer.id, "visibility") as
          | "visible"
          | "none"
          | undefined,
      );
    }
    map.setLayoutProperty(layer.id, "visibility", "none");
  }
}

function restoreBaseLandLayerVisibility(map: maplibregl.Map) {
  const store = HIDDEN_BASE_LAND_LAYER_VISIBILITY.get(map);
  if (!store) return;
  for (const [layerId, visibility] of store) {
    if (!map.getLayer(layerId)) continue;
    if (visibility === undefined) {
      map.setLayoutProperty(layerId, "visibility", undefined);
    } else {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }
  store.clear();
}

function isBaseMapLandColorLayer(layer: maplibregl.LayerSpecification) {
  if (
    layer.id.startsWith("bathymetry-") ||
    GSI_AERIAL_TILE_LAYERS.some((aerialLayer) => aerialLayer.id === layer.id)
  ) {
    return false;
  }
  if (layer.type === "background") {
    return hasBeigeYellowOrangeColor(layer.paint?.["background-color"]);
  }
  if (layer.type !== "fill") return false;
  return (
    hasBeigeYellowOrangeColor(layer.paint?.["fill-color"]) ||
    landLikeLayerNamePattern.test(layer.id) ||
    landLikeLayerNamePattern.test(String(layer["source-layer"] ?? ""))
  );
}

const landLikeLayerNamePattern = /land|earth|wood|park|grass|sand|beach/i;

function hasBeigeYellowOrangeColor(value: unknown): boolean {
  if (typeof value === "string") return isBeigeYellowOrangeHex(value);
  if (Array.isArray(value)) return value.some(hasBeigeYellowOrangeColor);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasBeigeYellowOrangeColor);
  }
  return false;
}

function isBeigeYellowOrangeHex(value: string) {
  const normalized = value.trim();
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) return false;
  const red = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const green = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const hue =
    max === min
      ? 0
      : max === red
        ? ((green - blue) / (max - min) + (green < blue ? 6 : 0)) * 60
        : max === green
          ? ((blue - red) / (max - min) + 2) * 60
          : ((red - green) / (max - min) + 4) * 60;
  return hue >= 20 && hue <= 65 && saturation >= 0.08 && max >= 0.45;
}

function removeBathymetryRuntimeLayers(map: maplibregl.Map) {
  map.setTerrain(null);
  const layers = [
    BATHYMETRY_COASTLINE_LAYER_ID,
    BATHYMETRY_LAND_MASK_LAYER_ID,
    ...PRIMARY_LAYER_IDS.slice().reverse(),
    ...FALLBACK_LAYER_IDS.slice().reverse(),
  ];
  for (const layerId of layers) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  const sources = [
    BATHYMETRY_COASTLINE_SOURCE_ID,
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
