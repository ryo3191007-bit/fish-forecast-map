"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { FishingReport } from "@/domain/fishing";

type FishingMapProps = { reports: FishingReport[] };

export function FishingMap({ reports }: FishingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [129.95, 33.48],
      zoom: 8.2,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }));

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = reports.map((report) => {
      const marker = new maplibregl.Marker({ color: scoreColor(report.forecast.score) })
        .setLngLat([report.longitude, report.latitude])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setDOMContent(createPopupContent(report)))
        .addTo(map);
      return marker;
    });

    return () => markers.forEach((marker) => marker.remove());
  }, [reports]);

  return (
    <div className="mapShell">
      <div ref={containerRef} className="map" aria-label="釣果地点マップ" />
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
