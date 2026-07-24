import assert from "node:assert/strict";
import fs from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots";
import { buildStaticFishingSpotDetailsFromSpots } from "../src/lib/fishingSpotDetailFallback";
import { mergeStaticSpotDetailOverrides } from "../src/lib/fishingSpotDetailRepository";
import { findDisplayableSpotDetail, formatSpotDetailValue, formatTerrainDetailForPresentation } from "../src/domain/spotEvaluationPresentation";
import type { FishingSpotDetailSet } from "../src/domain/fishingSpotDetail";

type Source = { id: string; sourceType: string; sourceUrl: string | null; checkedOn: string | null };
type CuratedValue = {
  id: string; itemKey: string; informationState: string; confidence: string | null;
  valueText: string | null; valueTextList: string[]; valueBoolean: boolean | null;
  checkedAt: string | null; note: string | null;
  sources: { supporting: string[]; checked: string[]; contradicting: string[] };
};
type CuratedSpot = { spotId: string; sources: Source[]; values: CuratedValue[] };
type CuratedFile = { issue: number; researchPolicy: Record<string, string>; spots: CuratedSpot[] };

const TARGET_SPOTS = ["ikitsuki-area", "ikitsuki-fishing-port", "tachiura-fishing-port", "misaki-fishing-port"] as const;
const path = "data/curation/fishing-spots/issue-290-ikitsuki-reresearch.json";
const curation = JSON.parse(fs.readFileSync(path, "utf8")) as CuratedFile;
const spots = curation.spots;
const fallbackSource = fs.readFileSync("src/lib/fishingSpotDetailFallback.ts", "utf8");
const repositorySource = fs.readFileSync("src/lib/fishingSpotDetailRepository.ts", "utf8");

assert.equal(curation.issue, 290);
assert.deepEqual(new Set(spots.map(({ spotId }) => spotId)), new Set(TARGET_SPOTS));
assert.equal(spots.flatMap(({ values }) => values).length, 33);
assert.match(curation.researchPolicy.scoreGuard, /SCORE v2/);
assert.match(curation.researchPolicy.safetyGuard, /low 根拠だけで採用しない/);
assert.match(curation.researchPolicy.scopeGuard, /広域情報|部分情報|混同/);
assert.match(curation.researchPolicy.restrictionGuard, /禁漁期|テトラ|漁業作業区域/);

for (const spot of spots) {
  assert.ok(fishingSpots.some(({ id }) => id === spot.spotId), `${spot.spotId}: master spot must exist`);
  assert.ok(spot.sources.length > 0);
  const sourceIds = new Set(spot.sources.map(({ id }) => id));
  assert.equal(sourceIds.size, spot.sources.length);
  for (const source of spot.sources) {
    assert.ok(source.sourceUrl?.startsWith("https://"), `${spot.spotId}:${source.id}: HTTPS source required`);
    assert.equal(source.checkedOn, "2026-07-24");
  }

  const displayableTerrain = spot.values.filter(({ itemKey, informationState }) =>
    ["coastal_topography", "spot_features", "shore_access"].includes(itemKey)
    && ["has_evidence", "weak_evidence"].includes(informationState)
  );
  assert.ok(displayableTerrain.length > 0, `${spot.spotId}: terrain/structure/foothold value required`);

  for (const value of spot.values) {
    assert.equal(value.checkedAt, "2026-07-24");
    assert.ok(value.id.endsWith(":issue290"));
    if (value.informationState === "weak_evidence") {
      assert.equal(value.confidence, "low");
      assert.ok(value.sources.supporting.length > 0);
    }
    if (value.informationState === "has_evidence") {
      assert.ok(["medium", "high"].includes(value.confidence ?? ""));
      assert.ok(value.sources.supporting.length > 0);
    }
    if (value.informationState === "researched_unknown") {
      assert.equal(value.confidence, null);
      assert.ok(value.sources.checked.length > 0);
      assert.equal(value.valueText, null);
      assert.deepEqual(value.valueTextList, []);
      assert.equal(value.valueBoolean, null);
    }
    for (const sourceId of [...value.sources.supporting, ...value.sources.checked, ...value.sources.contradicting]) {
      assert.ok(sourceIds.has(sourceId), `${spot.spotId}:${value.itemKey}: unknown source ${sourceId}`);
    }
    if (["restriction_status", "fishable_area"].includes(value.itemKey) && value.informationState === "weak_evidence") {
      assert.doesNotMatch(value.valueText ?? "", /利用可能|釣り可能|安全/);
    }
  }
}

const area = spots.find(({ spotId }) => spotId === "ikitsuki-area")!;
for (const key of ["parking", "toilet", "shore_access", "spot_features", "restriction_status", "fishable_area"]) {
  assert.match(area.values.find(({ itemKey }) => itemKey === key)?.note ?? "", /部分|全域|島|アクセス/);
}
assert.match(area.values.find(({ itemKey }) => itemKey === "parking")?.valueText ?? "", /道の駅生月大橋/);

const tachiuraRaw = spots.find(({ spotId }) => spotId === "tachiura-fishing-port")!;
assert.match(tachiuraRaw.values.find(({ itemKey }) => itemKey === "restriction_status")?.valueText ?? "", /漁業作業区域|採捕規制/);
assert.equal(tachiuraRaw.values.find(({ itemKey }) => itemKey === "parking")?.informationState, "researched_unknown");

const misakiRaw = spots.find(({ spotId }) => spotId === "misaki-fishing-port")!;
assert.match(misakiRaw.values.find(({ itemKey }) => itemKey === "obstacles")?.valueTextList.join("、") ?? "", /大型テトラ/);
assert.match(misakiRaw.values.find(({ itemKey }) => itemKey === "restriction_status")?.valueText ?? "", /5月初め.*9月末.*アオリイカ禁漁/);
assert.equal(misakiRaw.values.find(({ itemKey }) => itemKey === "fishable_area")?.informationState, "researched_unknown");

const runtime = buildStaticFishingSpotDetailsFromSpots(fishingSpots);
for (const spotId of TARGET_SPOTS) {
  const curatedSpot = spots.find((spot) => spot.spotId === spotId)!;
  const expectedKeys = curatedSpot.values
    .filter((value) => ["coastal_topography", "spot_features", "shore_access"].includes(value.itemKey)
      && ["has_evidence", "weak_evidence"].includes(value.informationState))
    .map((value) => value.itemKey);
  for (const itemKey of expectedKeys) {
    const actual = findDisplayableSpotDetail(
      { itemDefinitions: runtime.itemDefinitions, values: runtime.values.filter((value) => value.spotId === spotId) },
      itemKey,
    );
    assert.ok(actual);
    assert.ok(actual.id.endsWith(":issue290"));
    assert.equal(actual.note, null);
    assert.ok(actual.sources.every((entry) => entry.note === null && entry.source.sourceUrl === null && entry.source.note === null));
  }
}

const detailSet = (spotId: string): FishingSpotDetailSet => ({
  itemDefinitions: runtime.itemDefinitions,
  values: runtime.values.filter((value) => value.spotId === spotId),
});

const areaDetails = detailSet("ikitsuki-area");
assert.match(formatSpotDetailValue(findDisplayableSpotDetail(areaDetails, "coastal_topography")), /島しょ沿岸/);
assert.match(formatSpotDetailValue(findDisplayableSpotDetail(areaDetails, "parking")), /道の駅生月大橋/);
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(areaDetails, "fishable_area")), "調査済み・未確定");

const ikitsukiPort = detailSet("ikitsuki-fishing-port");
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(ikitsukiPort, "spot_features")), "防波堤");
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(ikitsukiPort, "parking")), "調査済み・未確定");

const tachiura = detailSet("tachiura-fishing-port");
assert.deepEqual(formatTerrainDetailForPresentation(tachiura, "spot_features"), { text: "堤防、岸壁", confidence: "low" });
assert.match(formatSpotDetailValue(findDisplayableSpotDetail(tachiura, "restriction_status")), /漁業作業区域/);

const misaki = detailSet("misaki-fishing-port");
assert.deepEqual(formatTerrainDetailForPresentation(misaki, "spot_features"), { text: "堤防", confidence: "low" });
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(misaki, "lighting")), "あり");
assert.match(formatSpotDetailValue(findDisplayableSpotDetail(misaki, "restriction_status")), /アオリイカ禁漁/);

const override = ikitsukiPort.values.find((value) => value.itemKey === "spot_features")!;
const oldCurated = { ...override, id: "old-database-value", informationState: "researched_unknown" as const, valueText: null, valueTextList: [], confidence: null, checkedAt: "2026-07-23" };
const merged = mergeStaticSpotDetailOverrides(
  { itemDefinitions: runtime.itemDefinitions, values: [oldCurated] },
  { itemDefinitions: runtime.itemDefinitions, values: [override] },
);
assert.equal(merged.values[0].id, override.id);

const approvedUserValue = {
  ...override, id: "approved-user-value", contributionOrigin: "user_contribution" as const,
  moderationStatus: "approved" as const, reviewStatus: "reviewed" as const, adoptionStatus: "adopted" as const,
};
const mergedWithApprovedUser = mergeStaticSpotDetailOverrides(
  { itemDefinitions: runtime.itemDefinitions, values: [oldCurated, approvedUserValue] },
  { itemDefinitions: runtime.itemDefinitions, values: [override] },
);
assert.equal(mergedWithApprovedUser.values[0].id, approvedUserValue.id);

const pendingUserValue = {
  ...approvedUserValue, id: "pending-user-value", moderationStatus: "pending" as const,
  reviewStatus: "pending_review" as const, adoptionStatus: "candidate" as const,
};
const mergedWithPendingUser = mergeStaticSpotDetailOverrides(
  { itemDefinitions: runtime.itemDefinitions, values: [oldCurated, pendingUserValue] },
  { itemDefinitions: runtime.itemDefinitions, values: [override] },
);
assert.equal(mergedWithPendingUser.values[0].id, override.id);
assert.ok(!mergedWithPendingUser.values.some((value) => value.id === pendingUserValue.id));

assert.match(fallbackSource, /issue290IkitsukiDetails/);
assert.match(repositorySource, /isStaticReresearchOverride/);
assert.match(repositorySource, /:issue\\d\+\$/);
assert.match(repositorySource, /remote database is not modified/);

console.log("Issue #290 Ikitsuki spot re-research tests passed");
