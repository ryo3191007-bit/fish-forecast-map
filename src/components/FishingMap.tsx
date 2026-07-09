"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { FishingReport } from "@/domain/fishing";
import { GSI_SEAMLESS_PHOTO_ATTRIBUTION, type MapLayerMode } from "@/domain/mapLayer";
import { MapLayerToggle } from "./MapLayerToggle";

type FishingMapProps = { reports: FishingReport[] };

export function FishingMap({ reports }: FishingMapProps) {
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || reports.length === 0) return;

    const adjustMapBounds = () => {
      fitMapToReports(map, reports, hasAdjustedBoundsRef.current);
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
  }, [reports]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyLayerMode = () => setAerialLayerVisibility(map, mapLayerMode === "aerial");
    if (map.loaded()) applyLayerMode();
    else map.once("load", applyLayerMode);

    return () => {
      map.off("load", applyLayerMode);
    };
  }, [mapLayerMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = reports.map((report) => {
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

    return () => markers.forEach((marker) => marker.remove());
  }, [reports]);

  return (
    <div className="mapShell">
      <div ref={containerRef} className="map" aria-label="釣果地点マップ" />
      <MapLayerToggle value={mapLayerMode} onChange={setMapLayerMode} />
      {mapLayerMode === "aerial" ? (
        <div className="mapAttribution" aria-label="航空写真の出典">
          {GSI_SEAMLESS_PHOTO_ATTRIBUTION}
          <span>航空写真はズーム14〜18付近を中心に表示されます。</span>
        </div>
      ) : null}
      {reports.length === 0 ? (
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
  score.textContent = `${report.forecast.score}点`;

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

function scoreColor(score: number) {
  if (score >= 70) return "#f97316";
  if (score >= 60) return "#0ea5e9";
  return "#64748b";
}

function fitMapToReports(
  map: maplibregl.Map,
  reports: FishingReport[],
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


function addAerialPhotoLayer(map: maplibregl.Map | null) {
  if (!map || map.getSource("gsi-seamless-photo")) return;

  map.addSource("gsi-seamless-photo", {
    type: "raster",
    tiles: ["https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg"],
    tileSize: 256,
    minzoom: 14,
    maxzoom: 18,
    attribution: GSI_SEAMLESS_PHOTO_ATTRIBUTION,
  });

  map.addLayer(
    {
      id: "gsi-seamless-photo",
      type: "raster",
      source: "gsi-seamless-photo",
      minzoom: 0,
      maxzoom: 20,
      layout: { visibility: "none" },
      paint: { "raster-opacity": 0.92 },
    },
    firstSymbolLayerId(map),
  );
}

function setAerialLayerVisibility(map: maplibregl.Map, isVisible: boolean) {
  if (!map.getLayer("gsi-seamless-photo")) {
    addAerialPhotoLayer(map);
  }
  if (!map.getLayer("gsi-seamless-photo")) return;

  map.setLayoutProperty("gsi-seamless-photo", "visibility", isVisible ? "visible" : "none");
}

function firstSymbolLayerId(map: maplibregl.Map) {
  return map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
}
