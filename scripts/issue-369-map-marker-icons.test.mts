import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAP_MARKER_LEGEND, mapMarkerIconSvg, markerKindForSpotType } from "../src/domain/mapMarkerPresentation.ts";

assert.deepEqual(["漁港", "堤防", "地磯", "磯場", "サーフ", "河口", "湾岸", "その他"].map((type) => markerKindForSpotType(type as Parameters<typeof markerKindForSpotType>[0])), ["port", "port", "rock", "rock", "surf", "place", "place", "place"]);
assert.deepEqual(MAP_MARKER_LEGEND.map(({ kind }) => kind), ["port", "rock", "surf", "place", "catch"]);
for (const { kind } of MAP_MARKER_LEGEND) assert.match(mapMarkerIconSvg(kind), /^<svg[^>]+aria-hidden="true"/);
const map = readFileSync(new URL("../src/components/FishingMap.tsx", import.meta.url), "utf8");
assert.match(map, /markerKindForSpotType\(spot\.spotType\)/);
assert.match(map, /mapIconMarker--catch/);
assert.match(map, /setAttribute\("aria-label", `\$\{memo\.spotName\}の登録済み釣果`\)/);
assert.match(map, /createExternalMemoPopupContent\(memo\)/, "catch popup remains wired");
assert.match(map, /className="mapMarkerLegend" aria-label="マーカー凡例"/);
console.log("Issue #369 map marker icon checks passed");
