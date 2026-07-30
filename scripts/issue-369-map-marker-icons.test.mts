import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAP_MARKER_LEGEND, mapMarkerIconSvg, markerKindForSpot } from "../src/domain/mapMarkerPresentation.ts";

assert.deepEqual(
  ["漁港", "堤防", "地磯", "磯場", "サーフ", "河口", "湾岸", "その他"].map((spotType) => markerKindForSpot({ id: "ordinary-spot", spotType: spotType as Parameters<typeof markerKindForSpot>[0]["spotType"] })),
  ["port", "port", "rock", "rock", "surf", "place", "place", "place"],
);
for (const id of ["karatsu-west-port", "karatsu-east-port", "hirado-port"]) {
  assert.equal(markerKindForSpot({ id, spotType: "その他" }), "port", `${id} uses its stable port id for presentation`);
}
assert.equal(markerKindForSpot({ id: "niji-matsubara", spotType: "その他" }), "place");
assert.equal(markerKindForSpot({ id: "ordinary-fishing-port", spotType: "漁港" }), "port");
assert.equal(markerKindForSpot({ id: "ordinary-breakwater", spotType: "堤防" }), "port");
assert.deepEqual(MAP_MARKER_LEGEND.map(({ kind }) => kind), ["port", "rock", "surf", "place", "catch"]);
assert.equal(MAP_MARKER_LEGEND.find(({ kind }) => kind === "rock")?.label, "磯");
for (const { kind } of MAP_MARKER_LEGEND) assert.match(mapMarkerIconSvg(kind), /^<svg[^>]+aria-hidden="true"/);
const map = readFileSync(new URL("../src/components/FishingMap.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
assert.match(map, /markerKindForSpot\(spot\)/);
assert.match(map, /<span class="mapIconMarkerPin mapIconMarker--\$\{markerKind\}">/);
assert.match(map, /<span class="mapIconMarkerPin mapIconMarker--catch">/);
assert.match(map, /setAttribute\("aria-label", `\$\{memo\.spotName\}の登録済み釣果`\)/);
assert.match(map, /createExternalMemoPopupContent\(memo\)/, "catch popup remains wired");
assert.match(map, /className="mapMarkerLegend" aria-label="マーカー凡例"/);
const markerRootRule = styles.match(/\.mapIconMarker\s*\{([^}]*)\}/)?.[1] ?? "";
const markerPinRule = styles.match(/\.mapIconMarkerPin\s*\{([^}]*)\}/)?.[1] ?? "";
assert.doesNotMatch(markerRootRule, /transform\s*:/, "MapLibre-managed marker root must not define a visual transform");
assert.match(markerPinRule, /transform:\s*rotate\(-45deg\)/, "inner pin owns the visual rotation");
assert.match(styles, /\.mapIconMarkerPin svg\s*\{\s*transform:\s*rotate\(45deg\)/, "the icon counter-rotates inside the pin");
console.log("Issue #369 map marker icon checks passed");
