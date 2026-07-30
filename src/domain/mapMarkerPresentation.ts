import type { FishingSpot, FishingSpotType } from "@/domain/fishingSpot";

export type MapMarkerKind = "port" | "rock" | "surf" | "place" | "catch" | "shop";

export const MAP_MARKER_LEGEND: ReadonlyArray<{ kind: MapMarkerKind; label: string }> = [
  { kind: "port", label: "港・波止" }, { kind: "rock", label: "磯" },
  { kind: "surf", label: "サーフ" }, { kind: "place", label: "地点" },
  { kind: "catch", label: "釣果" },
  { kind: "shop", label: "釣具店" },
];

export function markerKindForSpot(spot: Pick<FishingSpot, "id" | "spotType">): MapMarkerKind {
  if (spot.id.endsWith("-port")) return "port";

  const kinds: Record<FishingSpotType, MapMarkerKind> = {
    漁港: "port", 堤防: "port", 地磯: "rock", 磯場: "rock", サーフ: "surf",
    河口: "place", 湾岸: "place", その他: "place",
  };
  return kinds[spot.spotType];
}

const ICON_PATHS: Record<MapMarkerKind, string> = {
  port: '<path d="M5 18h14M7 15h10M9 15V8h6v7M12 8V4M9 6h6"/><path d="M6 20c2 1.4 4 .2 6 0 2 1.4 4 .2 6 0"/>',
  rock: '<path d="M4 19 8 10l3 4 3-8 6 13Z"/><path d="m7 19 4-5 3 5"/>',
  surf: '<path d="M3 10c2.2-2 4.4-2 6.6 0s4.4 2 6.6 0 3.8-1.6 4.8-.7M3 15c2.2-2 4.4-2 6.6 0s4.4 2 6.6 0 3.8-1.6 4.8-.7"/>',
  place: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  catch: '<path d="M4 12c3.8-5 9.4-5.8 14-1l3-3v8l-3-3c-4.6 4.8-10.2 4-14-1Z"/><circle cx="9" cy="11" r=".8"/>',
  shop: '<path d="M4 9h16l-1-5H5L4 9Z"/><path d="M6 9v11h12V9M9 20v-6h6v6"/><path d="M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0"/>',
};

export function mapMarkerIconSvg(kind: MapMarkerKind): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_PATHS[kind]}</svg>`;
}
