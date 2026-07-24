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

const TARGET_SPOTS = [
  "shin-shishi-fishing-port",
  "himosashi-port",
  "maetsuyoshi-fishing-port",
  "shijikiura-fishing-port",
  "miyanoura-fishing-port",
] as const;
const path = "data/curation/fishing-spots/issue-292-hirado-south-reresearch.json";
const curation = JSON.parse(fs.readFileSync(path, "utf8")) as CuratedFile;
const spots = curation.spots;
const fallbackSource = fs.readFileSync("src/lib/fishingSpotDetailFallback.ts", "utf8");
const repositorySource = fs.readFileSync("src/lib/fishingSpotDetailRepository.ts", "utf8");

assert.equal(curation.issue, 292);
assert.deepEqual(new Set(spots.map(({ spotId }) => spotId)), new Set(TARGET_SPOTS));
assert.equal(spots.flatMap(({ values }) => values).length, 44);
assert.match(curation.researchPolicy.scoreGuard, /SCORE v2/);
assert.match(curation.researchPolicy.safetyGuard, /low 根拠だけで採用しない/);
assert.match(curation.researchPolicy.scopeGuard, /混同|部分情報/);
assert.match(curation.researchPolicy.restrictionGuard, /立入禁止|釣り禁止|テトラ|防風フェンス/);
assert.match(curation.researchPolicy.unknownGuard, /checked|未調査と区別/);

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
    assert.ok(value.id.endsWith(":issue292"));
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
      assert.ok(value.note && value.note.length > 0);
    }
    for (const sourceId of [...value.sources.supporting, ...value.sources.checked, ...value.sources.contradicting]) {
      assert.ok(sourceIds.has(sourceId), `${spot.spotId}:${value.itemKey}: unknown source ${sourceId}`);
    }
    if (["restriction_status", "fishable_area"].includes(value.itemKey) && value.informationState === "weak_evidence") {
      assert.doesNotMatch(value.valueText ?? "", /利用可能|釣り可能|安全/);
    }
  }
}

const shinShishiRaw = spots.find(({ spotId }) => spotId === "shin-shishi-fishing-port")!;
assert.match(shinShishiRaw.values.find(({ itemKey }) => itemKey === "restriction_status")?.valueText ?? "", /獅子地区.*関係者以外立入禁止/);
assert.match(shinShishiRaw.values.find(({ itemKey }) => itemKey === "spot_features")?.note ?? "", /全体の構造を示さない/);

const himosashiRaw = spots.find(({ spotId }) => spotId === "himosashi-port")!;
assert.deepEqual(himosashiRaw.values.find(({ itemKey }) => itemKey === "spot_features")?.valueTextList, ["岸壁"]);
for (const key of ["shore_access", "restriction_status", "fishable_area", "parking", "toilet", "lighting"]) {
  const value = himosashiRaw.values.find(({ itemKey }) => itemKey === key);
  assert.equal(value?.informationState, "researched_unknown");
  assert.ok((value?.sources.checked.length ?? 0) > 0);
}

const maetsuyoshiRaw = spots.find(({ spotId }) => spotId === "maetsuyoshi-fishing-port")!;
assert.match(maetsuyoshiRaw.values.find(({ itemKey }) => itemKey === "obstacles")?.valueTextList.join("、") ?? "", /足場の悪いテトラ.*防風フェンス/);
assert.equal(maetsuyoshiRaw.values.find(({ itemKey }) => itemKey === "restriction_status")?.informationState, "researched_unknown");
assert.ok((maetsuyoshiRaw.values.find(({ itemKey }) => itemKey === "restriction_status")?.sources.contradicting.length ?? 0) > 0);

const shijikiuraRaw = spots.find(({ spotId }) => spotId === "shijikiura-fishing-port")!;
assert.equal(shijikiuraRaw.values.find(({ itemKey }) => itemKey === "lighting")?.valueBoolean, true);
assert.equal(shijikiuraRaw.values.find(({ itemKey }) => itemKey === "toilet")?.confidence, "low");
assert.equal(shijikiuraRaw.values.find(({ itemKey }) => itemKey === "parking")?.informationState, "researched_unknown");

const miyanouraRaw = spots.find(({ spotId }) => spotId === "miyanoura-fishing-port")!;
assert.match(miyanouraRaw.values.find(({ itemKey }) => itemKey === "restriction_status")?.valueText ?? "", /東防波堤.*進入禁止.*港内.*魚釣り禁止/);
assert.match(miyanouraRaw.values.find(({ itemKey }) => itemKey === "obstacles")?.valueTextList.join("、") ?? "", /巨大テトラ/);
assert.equal(miyanouraRaw.values.find(({ itemKey }) => itemKey === "access")?.confidence, "medium");
assert.equal(miyanouraRaw.values.find(({ itemKey }) => itemKey === "fishable_area")?.informationState, "researched_unknown");

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
    assert.ok(actual.id.endsWith(":issue292"));
    assert.equal(actual.note, null);
    assert.ok(actual.sources.every((entry) => entry.note === null && entry.source.sourceUrl === null && entry.source.note === null));
  }
}

const detailSet = (spotId: string): FishingSpotDetailSet => ({
  itemDefinitions: runtime.itemDefinitions,
  values: runtime.values.filter((value) => value.spotId === spotId),
});

const shinShishi = detailSet("shin-shishi-fishing-port");
assert.deepEqual(formatTerrainDetailForPresentation(shinShishi, "spot_features"), { text: "堤防", confidence: "low" });
assert.match(formatSpotDetailValue(findDisplayableSpotDetail(shinShishi, "restriction_status")), /関係者以外立入禁止/);

const himosashi = detailSet("himosashi-port");
assert.deepEqual(formatTerrainDetailForPresentation(himosashi, "spot_features"), { text: "岸壁", confidence: "low" });
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(himosashi, "restriction_status")), "調査済み・未確定");

const maetsuyoshi = detailSet("maetsuyoshi-fishing-port");
assert.deepEqual(formatTerrainDetailForPresentation(maetsuyoshi, "spot_features"), { text: "堤防、岸壁", confidence: "low" });
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(maetsuyoshi, "restriction_status")), "調査済み・未確定");

const shijikiura = detailSet("shijikiura-fishing-port");
assert.deepEqual(formatTerrainDetailForPresentation(shijikiura, "spot_features"), { text: "堤防、岸壁", confidence: "low" });
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(shijikiura, "lighting")), "あり");
assert.match(formatSpotDetailValue(findDisplayableSpotDetail(shijikiura, "toilet")), /志々伎浦漁港公園/);

const miyanoura = detailSet("miyanoura-fishing-port");
assert.deepEqual(formatTerrainDetailForPresentation(miyanoura, "spot_features"), { text: "堤防、岸壁、磯", confidence: "low" });
assert.match(formatSpotDetailValue(findDisplayableSpotDetail(miyanoura, "restriction_status")), /東防波堤.*進入禁止/);
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(miyanoura, "fishable_area")), "調査済み・未確定");

const override = miyanoura.values.find((value) => value.itemKey === "spot_features")!;
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

const reresearchFiles = [
  "issue-278-itoshima-detail-reresearch.json",
  "issue-278-itoshima-detail-reresearch-central.json",
  "issue-278-itoshima-detail-reresearch-south.json",
  "issue-280-karatsu-bay-reresearch-beaches.json",
  "issue-280-karatsu-bay-reresearch-east-west.json",
  "issue-280-karatsu-bay-reresearch-coastal.json",
  "issue-282-yobuko-chinzei-reresearch-yobuko.json",
  "issue-282-yobuko-chinzei-reresearch-chinzei.json",
  "issue-284-hizen-imari-east-reresearch-hizen.json",
  "issue-284-hizen-imari-east-reresearch-imari.json",
  "issue-286-matsuura-reresearch-fukushima.json",
  "issue-286-matsuura-reresearch-takashima.json",
  "issue-288-hirado-seto-reresearch.json",
  "issue-288-hirado-north-reresearch.json",
  "issue-290-ikitsuki-reresearch.json",
  "issue-292-hirado-south-reresearch.json",
];
const allReresearchedIds = reresearchFiles.flatMap((filename) => {
  const parsed = JSON.parse(fs.readFileSync(`data/curation/fishing-spots/${filename}`, "utf8")) as { spots: Array<{ spotId: string }> };
  return parsed.spots.map(({ spotId }) => spotId);
});
assert.equal(allReresearchedIds.length, 52);
assert.equal(new Set(allReresearchedIds).size, 52);
assert.deepEqual(new Set(allReresearchedIds), new Set(fishingSpots.map(({ id }) => id)));

assert.match(fallbackSource, /issue292HiradoSouthDetails/);
assert.match(repositorySource, /isStaticReresearchOverride/);
assert.match(repositorySource, /:issue\\d\+\$/);
assert.match(repositorySource, /remote database is not modified/);

console.log("Issue #292 Hirado south re-research tests passed");
