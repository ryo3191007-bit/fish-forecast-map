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
import { MapLayerToggle } from "./MapLayerToggle";

type FishingMapProps = { reports: FishingReport[]; externalMemos: ExternalCatchMemo[]; spots: FishingSpot[] };

type MappableExternalMemo = ExternalCatchMemo & { latitude: number; longitude: number; spotName: string };

export function FishingMap({ reports, externalMemos, spots }: FishingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasAdjustedBoundsRef = useRef(false);
  const [mapLayerMode, setMapLayerMode] = useState<MapLayerMode>("standard");

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

  const mappableExternalMemos = useMemo(() => externalMemos.flatMap((memo): MappableExternalMemo[] => {
    const spot = memo.spotId ? spots.find((item) => item.id === memo.spotId) : undefined;
    return spot ? [{ ...memo, latitude: spot.latitude, longitude: spot.longitude, spotName: spot.name }] : [];
  }), [externalMemos, spots]);

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
    const map = mapRef.current;
    if (!map) return;

    const applyLayerMode = () =>
      setAerialLayerVisibility(map, mapLayerMode === "aerial");
    if (map.loaded()) applyLayerMode();
    else map.once("load", applyLayerMode);

    return () => {
      map.off("load", applyLayerMode);
    };
  }, [mapLayerMode]);

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
        .setPopup(new maplibregl.Popup({ offset: 16 }).setDOMContent(createExternalMemoPopupContent(memo)))
        .addTo(map);
    });

    return () => [...reportMarkers, ...memoMarkers].forEach((marker) => marker.remove());
  }, [mappableExternalMemos, reports]);

  return (
    <div className="mapShell">
      <div ref={containerRef} className="map" aria-label="釣果地点マップ" />
      <MapLayerToggle value={mapLayerMode} onChange={setMapLayerMode} />
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
  badge.textContent = "外部メモ / 手動メモ";
  const species = document.createElement("span");
  species.textContent = String(memo.species);
  const area = document.createElement("span");
  area.textContent = memo.areaName;
  summary.append(badge, species, area);
  const meta = document.createElement("p");
  meta.className = "mapPopupMeta";
  meta.textContent = `${memo.caughtDate} / ${memo.sourceName} / 信頼度: ${memo.confidence}`;
  const note = document.createElement("p");
  note.textContent = `${memo.spotName}に参考表示しています。条件に合うメモは既存地点SCOREへ参考反映されます。`;
  const link = document.createElement("a");
  link.href = memo.sourceUrl;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "出典URLを開く";
  popup.append(title, summary, meta, note, link);
  return popup;
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
