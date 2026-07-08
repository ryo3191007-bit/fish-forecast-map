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
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setHTML(
            `<strong>${report.spotName}</strong><br />${report.species} / ${report.forecast.score}点<br />${report.forecast.reasons[0]}`,
          ),
        )
        .addTo(map);
      return marker;
    });

    return () => markers.forEach((marker) => marker.remove());
  }, [reports]);

  return <div ref={containerRef} className="map" aria-label="釣果地点マップ" />;
}

function scoreColor(score: number) {
  if (score >= 70) return "#f97316";
  if (score >= 60) return "#0ea5e9";
  return "#64748b";
}
