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
  BATHYMETRY_MAX_ZOOM,
  BATHYMETRY_MIN_ZOOM,
  BATHYMETRY_COLOR_LAYER_ID,
  BATHYMETRY_COLOR_SOURCE_ID,
  BATHYMETRY_COLOR_TILE_URL,
  BATHYMETRY_CONTOUR_GEOJSON_URL,
  BATHYMETRY_CONTOUR_LABEL_LAYER_ID,
  BATHYMETRY_CONTOUR_LAYER_ID,
  BATHYMETRY_CONTOUR_SOURCE_ID,
  BATHYMETRY_DEPTH_STOPS,
  BATHYMETRY_HILLSHADE_LAYER_ID,
  BATHYMETRY_LICENSE_NOTE,
  BATHYMETRY_SAFETY_NOTE,
  BATHYMETRY_SOURCE_ID,
  BATHYMETRY_TILE_URL,
  BATHYMETRY_FALLBACK_COLOR_SOURCE_ID,
  BATHYMETRY_FALLBACK_COLOR_TILE_URL,
  BATHYMETRY_FALLBACK_CONTOUR_GEOJSON_URL,
  BATHYMETRY_FALLBACK_CONTOUR_SOURCE_ID,
  BATHYMETRY_FALLBACK_SOURCE_ID,
  BATHYMETRY_FALLBACK_TILE_URL,
  GSI_STANDARD_ATTRIBUTION,
  GSI_STANDARD_NOTE,
  GSI_STANDARD_OVERLAY_LAYER_ID,
  GSI_STANDARD_OVERLAY_OPACITY,
  GSI_STANDARD_OVERLAY_SOURCE_ID,
  GSI_STANDARD_TILE_URL,
  shouldEnableInitialGsiOverlay,
  shouldEnableInitialTerrain,
} from "@/domain/bathymetry";
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

export function FishingMap({ reports, externalMemos, spots }: FishingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasAdjustedBoundsRef = useRef(false);
  const [mapLayerMode, setMapLayerMode] = useState<MapLayerMode>("standard");
  const [isTerrainEnabled, setIsTerrainEnabled] = useState(false);
  const [terrainStatus, setTerrainStatus] = useState<
    "3d" | "2d" | "unsupported" | "error"
  >("2d");
  const [bathymetryLoadError, setBathymetryLoadError] = useState(false);
  const [bathymetryFallbackActive, setBathymetryFallbackActive] = useState(false);
  const [isGsiOverlayEnabled, setIsGsiOverlayEnabled] = useState(false);
  const [tidExpanded, setTidExpanded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [129.95, 33.48],
      zoom: 8.2,
    });
    mapRef.current.on("load", () => addAerialPhotoLayer(mapRef.current));
    mapRef.current.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
    );

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

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

    if (map.loaded()) {
      adjustMapBounds();
      return;
    }

    map.once("load", adjustMapBounds);

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
    setIsGsiOverlayEnabled(shouldEnableInitialGsiOverlay(window.innerWidth));
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyLayerMode = () => {
      setAerialLayerVisibility(map, mapLayerMode === "aerial");
      applyBathymetryMode(
        map,
        mapLayerMode,
        isTerrainEnabled,
        setTerrainStatus,
        setMapLayerMode,
        setBathymetryLoadError,
        setBathymetryFallbackActive,
        isGsiOverlayEnabled,
      );
    };
    if (map.loaded()) applyLayerMode();
    else map.once("load", applyLayerMode);

    return () => {
      map.off("load", applyLayerMode);
    };
  }, [isGsiOverlayEnabled, isTerrainEnabled, mapLayerMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const reportMarkers = reports.map((report) => {
      const marker = new maplibregl.Marker({
        color: scoreColor(report.forecast.score),
      })
        .setLngLat([report.longitude, report.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setDOMContent(
            createPopupContent(report),
          ),
        )
        .addTo(map);
      return marker;
    });

    const memoMarkers = mappableExternalMemos.map((memo) => {
      return new maplibregl.Marker({ color: "#a855f7" })
        .setLngLat([memo.longitude, memo.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setDOMContent(
            createExternalMemoPopupContent(memo),
          ),
        )
        .addTo(map);
    });

    return () =>
      [...reportMarkers, ...memoMarkers].forEach((marker) => marker.remove());
  }, [mappableExternalMemos, reports]);

  return (
    <div className="mapShell">
      <div ref={containerRef} className="map" aria-label="釣果地点マップ" />
      <MapLayerToggle value={mapLayerMode} onChange={setMapLayerMode} />
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
            <button className="terrainToggleButton" type="button" aria-pressed={isGsiOverlayEnabled} title="国土地理院標準地図overlayを切り替え" onClick={() => setIsGsiOverlayEnabled((value) => !value)}>海岸線表示</button>
            <button className="terrainToggleButton" type="button" aria-expanded={tidExpanded} title="GEBCO TID Gridのデータ由来を表示" onClick={() => setTidExpanded((value) => !value)}>データ由来</button>
            <span className="terrainStatus">
              {terrainStatus === "3d"
                ? "3D地形表示"
                : terrainStatus === "error"
                  ? "3D初期化失敗: 2D表示"
                  : terrainStatus === "unsupported"
                    ? "この端末では2D表示"
                    : "2D軽量表示"}
            </span>
            {tidExpanded ? (
              <div className="tidSummary" aria-label="GEBCO TID Gridによるデータ由来">
                この周辺の水深データ: 実測 7% / 補間 63% / 混在・陸域 30%
                <small>GEBCO TID Gridによる中心周辺17×17セルの目安。沿岸では陸セル混在により比率が変動します。</small>
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
            {BATHYMETRY_ATTRIBUTION}
            <span>{BATHYMETRY_LICENSE_NOTE}</span>
            <span>{BATHYMETRY_SAFETY_NOTE}</span>
            <span>{GSI_STANDARD_ATTRIBUTION} / {GSI_STANDARD_NOTE}</span>
          </div>
        </>
      ) : null}
      {bathymetryLoadError ? (
        <div className="mapNotice" role="status">
          {bathymetryFallbackActive ? "高解像度水深を読み込めなかったため、広域水深へ切り替えました" : "水深データを読み込めませんでした"}
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

  const spotName = document.createElement("strong");
  spotName.className = "mapPopupTitle";
  spotName.textContent = report.spotName;

  popup.className = "mapPopup";

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

function applyBathymetryMode(
  map: maplibregl.Map,
  mode: MapLayerMode,
  terrainEnabled: boolean,
  setTerrainStatus: (status: "3d" | "2d" | "unsupported" | "error") => void,
  setMapLayerMode: (mode: MapLayerMode) => void,
  setBathymetryLoadError: (hasError: boolean) => void,
  setBathymetryFallbackActive: (active: boolean) => void,
  gsiOverlayEnabled: boolean,
) {
  const showBathymetry = mode === "bathymetry";
  if (showBathymetry) {
    setBathymetryLoadError(false);
    addBathymetryLayers(map, () => {
      map.setTerrain(null);
      setTerrainStatus("error");
      setBathymetryLoadError(true);
      setBathymetryFallbackActive(true);
      enableBathymetryFallback(map);
    });
  }
  for (const layerId of [
    BATHYMETRY_COLOR_LAYER_ID,
    BATHYMETRY_HILLSHADE_LAYER_ID,
    BATHYMETRY_CONTOUR_LAYER_ID,
    BATHYMETRY_CONTOUR_LABEL_LAYER_ID,
    GSI_STANDARD_OVERLAY_LAYER_ID,
  ]) {
    if (map.getLayer(layerId))
      map.setLayoutProperty(
        layerId,
        "visibility",
        showBathymetry && (layerId !== GSI_STANDARD_OVERLAY_LAYER_ID || gsiOverlayEnabled) ? "visible" : "none",
      );
  }
  try {
    if (
      showBathymetry &&
      terrainEnabled &&
      map.getSource(BATHYMETRY_SOURCE_ID)
    ) {
      map.setTerrain({ source: BATHYMETRY_SOURCE_ID, exaggeration: 1 });
      map.easeTo({ pitch: 52, bearing: -18, duration: 650, essential: false });
      setTerrainStatus("3d");
    } else {
      map.setTerrain(null);
      map.easeTo({ pitch: 0, bearing: 0, duration: 350, essential: false });
      setTerrainStatus(showBathymetry ? "2d" : "2d");
    }
  } catch (error) {
    console.warn(
      "[bathymetry] terrain initialization failed; falling back to 2D",
      error,
    );
    map.setTerrain(null);
    setTerrainStatus("error");
  }
}

function addBathymetryLayers(map: maplibregl.Map, onBathymetryError: () => void) {
  const mapWithFlag = map as maplibregl.Map & { __bathymetryErrorHandlerAdded?: boolean };
  if (!mapWithFlag.__bathymetryErrorHandlerAdded) {
    map.on("error", (event) => {
      const sourceId = (event as maplibregl.ErrorEvent & { sourceId?: string }).sourceId;
      const message = event.error?.message ?? "";
      if (sourceId?.includes("gebco-2026") || message.includes("bathymetry/gebco-2026")) onBathymetryError();
    });
    mapWithFlag.__bathymetryErrorHandlerAdded = true;
  }
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
  if (!map.getSource(GSI_STANDARD_OVERLAY_SOURCE_ID)) {
    map.addSource(GSI_STANDARD_OVERLAY_SOURCE_ID, { type: "raster", tiles: [GSI_STANDARD_TILE_URL], tileSize: 256, minzoom: 5, maxzoom: 18, attribution: GSI_STANDARD_ATTRIBUTION });
  }
  if (!map.getSource(BATHYMETRY_CONTOUR_SOURCE_ID)) {
    map.addSource(BATHYMETRY_CONTOUR_SOURCE_ID, {
      type: "geojson",
      data: BATHYMETRY_CONTOUR_GEOJSON_URL,
    });
  }
  const beforeId = firstSymbolLayerId(map);
  if (!map.getLayer(BATHYMETRY_COLOR_LAYER_ID))
    map.addLayer(
      {
        id: BATHYMETRY_COLOR_LAYER_ID,
        type: "raster",
        source: BATHYMETRY_COLOR_SOURCE_ID,
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.62 },
      },
      beforeId,
    );
  if (!map.getLayer(BATHYMETRY_HILLSHADE_LAYER_ID))
    map.addLayer(
      {
        id: BATHYMETRY_HILLSHADE_LAYER_ID,
        type: "hillshade",
        source: BATHYMETRY_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "hillshade-shadow-color": "#082f49",
          "hillshade-highlight-color": "#dffbff",
          "hillshade-accent-color": "#0ea5e9",
          "hillshade-exaggeration": 0.28,
        },
      },
      beforeId,
    );
  if (!map.getLayer(GSI_STANDARD_OVERLAY_LAYER_ID))
    map.addLayer({ id: GSI_STANDARD_OVERLAY_LAYER_ID, type: "raster", source: GSI_STANDARD_OVERLAY_SOURCE_ID, layout: { visibility: "none" }, paint: { "raster-opacity": GSI_STANDARD_OVERLAY_OPACITY } }, beforeId);
  if (!map.getLayer(BATHYMETRY_CONTOUR_LAYER_ID))
    map.addLayer(
      {
        id: BATHYMETRY_CONTOUR_LAYER_ID,
        type: "line",
        source: BATHYMETRY_CONTOUR_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "line-color": "#dffbff",
          "line-opacity": 0.72,
          "line-width": ["case", ["==", ["get", "major"], true], 1.4, 0.7],
        },
      },
      beforeId,
    );
  if (!map.getLayer(BATHYMETRY_CONTOUR_LABEL_LAYER_ID))
    map.addLayer({
      id: BATHYMETRY_CONTOUR_LABEL_LAYER_ID,
      type: "symbol",
      minzoom: 8,
      source: BATHYMETRY_CONTOUR_SOURCE_ID,
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

function enableBathymetryFallback(map: maplibregl.Map) {
  if (!map.getSource(BATHYMETRY_FALLBACK_SOURCE_ID)) {
    map.addSource(BATHYMETRY_FALLBACK_SOURCE_ID, { type: "raster-dem", tiles: [BATHYMETRY_FALLBACK_TILE_URL], tileSize: 256, minzoom: BATHYMETRY_MIN_ZOOM, maxzoom: BATHYMETRY_MAX_ZOOM, bounds: [...BATHYMETRY_BOUNDS], encoding: "mapbox", attribution: BATHYMETRY_ATTRIBUTION });
  }
  if (!map.getSource(BATHYMETRY_FALLBACK_COLOR_SOURCE_ID)) {
    map.addSource(BATHYMETRY_FALLBACK_COLOR_SOURCE_ID, { type: "raster", tiles: [BATHYMETRY_FALLBACK_COLOR_TILE_URL], tileSize: 256, minzoom: BATHYMETRY_MIN_ZOOM, maxzoom: BATHYMETRY_MAX_ZOOM, bounds: [...BATHYMETRY_BOUNDS], attribution: BATHYMETRY_ATTRIBUTION });
  }
  if (!map.getSource(BATHYMETRY_FALLBACK_CONTOUR_SOURCE_ID)) {
    map.addSource(BATHYMETRY_FALLBACK_CONTOUR_SOURCE_ID, { type: "geojson", data: BATHYMETRY_FALLBACK_CONTOUR_GEOJSON_URL });
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
    (nextBounds, report) => {
      return nextBounds.extend([report.longitude, report.latitude]);
    },
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
