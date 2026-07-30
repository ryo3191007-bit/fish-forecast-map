import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fishingShops } from "../src/data/fishingShops.ts";
import { MAP_MARKER_LEGEND, mapMarkerIconSvg } from "../src/domain/mapMarkerPresentation.ts";

assert.ok(fishingShops.length >= 7, "verified static shops include the follow-up research additions");
assert.equal(
  fishingShops.find(({ id }) => id === "yutoku-ikitsuki")?.name,
  "ホームセンターユートク 生月店",
  "non-specialist stores with verified tackle sales remain eligible",
);
assert.equal(new Set(fishingShops.map(({ id }) => id)).size, fishingShops.length, "shop ids are stable and unique");
for (const shop of fishingShops) {
  assert.ok(shop.id && shop.name && shop.checkedAt && shop.source.label && shop.source.url);
  assert.ok(Number.isFinite(shop.latitude) && Number.isFinite(shop.longitude));
  assert.match(shop.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(shop.openingHours === undefined || shop.openingHoursCheckedAt, "volatile hours carry a checked date");
}
const research = JSON.parse(readFileSync(new URL("../docs/research/ISSUE_370_FISHING_SHOP_RESEARCH.json", import.meta.url), "utf8"));
assert.deepEqual(research.areas.map(({ area }: { area: string }) => area), [
  "糸島西岸", "唐津湾", "呼子・鎮西", "伊万里湾", "松浦", "平戸", "生月",
]);
const adoptedShopIds = research.areas.flatMap(({ candidates }: { candidates: { decision: string; shopId?: string }[] }) =>
  candidates.filter(({ decision }) => decision === "adopted").map(({ shopId }) => shopId),
);
assert.deepEqual(new Set(adoptedShopIds), new Set(fishingShops.map(({ id }) => id)));
for (const area of research.areas) {
  assert.ok(area.result && area.candidates.length > 0, `${area.area} records candidates and a result`);
  for (const candidate of area.candidates) {
    assert.ok(candidate.reason, `${candidate.name} records a decision reason`);
    assert.ok(candidate.sources.length > 0, `${candidate.name} records traceable evidence`);
  }
}
assert.equal(MAP_MARKER_LEGEND.find(({ kind }) => kind === "shop")?.label, "釣具店");
assert.match(mapMarkerIconSvg("shop"), /<svg/);

const spots = readFileSync(new URL("../src/data/fishingSpots.ts", import.meta.url), "utf8");
const map = readFileSync(new URL("../src/components/FishingMap.tsx", import.meta.url), "utf8");
assert.doesNotMatch(spots, /fishingShops|marukin-/i, "shop POIs stay outside the fishing spot master");
assert.match(map, /createFishingShopPopupContent\(shop\)/);
assert.match(map, /mapIconMarker--shop/);
assert.match(map, /公式店舗ページを確認/);
const popupBody = map.match(/function createFishingShopPopupContent[\s\S]+?\n}\n\nfunction addPrimary/)?.[0] ?? "";
assert.doesNotMatch(popupBody, /地点評価|onOpenSpotEvaluation/);
console.log("Issue #370 fishing shop POI checks passed");
