import assert from "node:assert/strict";
import fs from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots";
import { buildStaticFishingSpotDetailsFromSpots } from "../src/lib/fishingSpotDetailFallback";
import { mergeStaticSpotDetailOverrides } from "../src/lib/fishingSpotDetailRepository";
import { findDisplayableSpotDetail, formatSpotDetailValue, formatTerrainDetailForPresentation } from "../src/domain/spotEvaluationPresentation";
import type { FishingSpotDetailSet } from "../src/domain/fishingSpotDetail";

type Source = {
  id: string;
  sourceType: string;
  sourceUrl: string | null;
  checkedOn: string | null;
};

type CuratedValue = {
  id: string;
  itemKey: string;
  informationState: string;
  confidence: string | null;
  valueText: string | null;
  valueTextList: string[];
  valueBoolean: boolean | null;
  checkedAt: string | null;
  note: string | null;
  sources: { supporting: string[]; checked: string[]; contradicting: string[] };
};

type CuratedSpot = { spotId: string; sources: Source[]; values: CuratedValue[] };
type CuratedFile = { issue: number; researchPolicy: Record<string, string>; spots: CuratedSpot[] };

const TARGET_SPOTS = [
  "haregi-port",
  "takakushi-port",
  "imari-inner-bay",
  "hatazu-fishing-port",
  "imarin-beach",
] as const;

const files = [
  "data/curation/fishing-spots/issue-284-hizen-imari-east-reresearch-hizen.json",
  "data/curation/fishing-spots/issue-284-hizen-imari-east-reresearch-imari.json",
];
const curations = files.map((path) => JSON.parse(fs.readFileSync(path, "utf8")) as CuratedFile);
const spots = curations.flatMap(({ spots }) => spots);
const fallbackSource = fs.readFileSync("src/lib/fishingSpotDetailFallback.ts", "utf8");
const repositorySource = fs.readFileSync("src/lib/fishingSpotDetailRepository.ts", "utf8");

assert.ok(curations.every(({ issue }) => issue === 284));
assert.deepEqual(new Set(spots.map(({ spotId }) => spotId)), new Set(TARGET_SPOTS));
assert.equal(spots.flatMap(({ values }) => values).length, 40);
assert.match(curations[0].researchPolicy.scoreGuard, /SCORE v2/);
assert.match(curations[0].researchPolicy.safetyGuard, /low 根拠だけで採用しない/);
assert.match(curations[0].researchPolicy.scopeGuard, /適用範囲/);
assert.match(curations[0].researchPolicy.beachGuard, /釣り可否・安全性を推定しない/);

for (const spot of spots) {
  assert.ok(fishingSpots.some(({ id }) => id === spot.spotId), `${spot.spotId}: master spot must exist`);
  assert.ok(spot.sources.length > 0, `${spot.spotId}: source metadata is required`);
  const sourceIds = new Set(spot.sources.map(({ id }) => id));
  assert.equal(sourceIds.size, spot.sources.length, `${spot.spotId}: source IDs must be unique`);
  for (const source of spot.sources) {
    assert.ok(source.sourceUrl?.startsWith("https://"), `${spot.spotId}:${source.id}: HTTPS source required`);
    assert.equal(source.checkedOn, "2026-07-24");
  }

  const terrainOrStructure = spot.values.filter(({ itemKey, informationState }) =>
    ["coastal_topography", "spot_features", "shore_access"].includes(itemKey)
    && ["has_evidence", "weak_evidence"].includes(informationState)
  );
  assert.ok(terrainOrStructure.length > 0, `${spot.spotId}: terrain/structure/foothold value required`);

  for (const value of spot.values) {
    assert.equal(value.checkedAt, "2026-07-24", `${spot.spotId}:${value.itemKey}: checked date required`);
    assert.equal(value.id.endsWith(":issue284"), true, `${spot.spotId}:${value.itemKey}: override suffix required`);
    if (value.informationState === "weak_evidence") {
      assert.equal(value.confidence, "low", `${spot.spotId}:${value.itemKey}: weak evidence must be low`);
      assert.ok(value.sources.supporting.length > 0, `${spot.spotId}:${value.itemKey}: supporting source required`);
    }
    if (value.informationState === "has_evidence") {
      assert.ok(["medium", "high"].includes(value.confidence ?? ""), `${spot.spotId}:${value.itemKey}: accepted confidence required`);
      assert.ok(value.sources.supporting.length > 0, `${spot.spotId}:${value.itemKey}: supporting source required`);
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
      assert.doesNotMatch(value.valueText ?? "", /利用可能|釣り可能|安全/, `${spot.spotId}:${value.itemKey}: low evidence must not affirm access or safety`);
    }
  }
}

const imariInnerRaw = spots.find(({ spotId }) => spotId === "imari-inner-bay")!;
for (const value of imariInnerRaw.values.filter(({ itemKey }) =>
  ["historical_target_species", "coastal_topography", "spot_features", "shore_access", "restriction_status"].includes(itemKey)
)) {
  assert.match(value.note ?? "", /部分|全域/, `imari-inner-bay:${value.itemKey}: broad-area scope must be limited`);
}

const imarinRaw = spots.find(({ spotId }) => spotId === "imarin-beach")!;
assert.equal(imarinRaw.values.find(({ itemKey }) => itemKey === "fishable_area")?.informationState, "researched_unknown");
assert.match(imarinRaw.values.find(({ itemKey }) => itemKey === "fishable_area")?.note ?? "", /釣り可否を推定しない/);
assert.match(imarinRaw.values.find(({ itemKey }) => itemKey === "restriction_status")?.valueText ?? "", /釣り可否は未確認/);

const runtime = buildStaticFishingSpotDetailsFromSpots(fishingSpots);
for (const spotId of TARGET_SPOTS) {
  const curatedSpot = spots.find((spot) => spot.spotId === spotId)!;
  const expectedKeys = curatedSpot.values
    .filter((value) => ["coastal_topography", "spot_features", "shore_access"].includes(value.itemKey))
    .map((value) => value.itemKey);
  assert.ok(expectedKeys.length > 0);
  for (const itemKey of expectedKeys) {
    const actual = findDisplayableSpotDetail(
      { itemDefinitions: runtime.itemDefinitions, values: runtime.values.filter((value) => value.spotId === spotId) },
      itemKey,
    );
    assert.ok(actual, `${spotId}:${itemKey}: latest re-research value must be displayable`);
    assert.equal(actual.id.endsWith(":issue284"), true);
    assert.equal(actual.note, null, `${spotId}:${itemKey}: internal note must not cross the runtime boundary`);
    assert.ok(actual.sources.every((entry) => entry.note === null && entry.source.sourceUrl === null && entry.source.note === null));
  }
}

const haregi: FishingSpotDetailSet = {
  itemDefinitions: runtime.itemDefinitions,
  values: runtime.values.filter((value) => value.spotId === "haregi-port"),
};
assert.deepEqual(formatTerrainDetailForPresentation(haregi, "spot_features"), { text: "堤防、岸壁、テトラ", confidence: "low" });
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(haregi, "parking")), "調査済み・未確定");
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(haregi, "lighting")), "あり");

const imariInner: FishingSpotDetailSet = {
  itemDefinitions: runtime.itemDefinitions,
  values: runtime.values.filter((value) => value.spotId === "imari-inner-bay"),
};
assert.deepEqual(formatTerrainDetailForPresentation(imariInner, "coastal_topography"), { text: "浅場、河口", confidence: "low" });
assert.deepEqual(formatTerrainDetailForPresentation(imariInner, "spot_features"), { text: "堤防、岸壁、護岸", confidence: "low" });
assert.match(formatSpotDetailValue(findDisplayableSpotDetail(imariInner, "restriction_status")), /関係者以外立入禁止/);

const hatazu: FishingSpotDetailSet = {
  itemDefinitions: runtime.itemDefinitions,
  values: runtime.values.filter((value) => value.spotId === "hatazu-fishing-port"),
};
assert.deepEqual(formatTerrainDetailForPresentation(hatazu, "spot_features"), { text: "堤防、岸壁", confidence: "low" });
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(hatazu, "fishable_area")), "調査済み・未確定");

const imarin: FishingSpotDetailSet = {
  itemDefinitions: runtime.itemDefinitions,
  values: runtime.values.filter((value) => value.spotId === "imarin-beach"),
};
assert.deepEqual(formatTerrainDetailForPresentation(imarin, "coastal_topography"), { text: "砂地", confidence: "medium" });
assert.deepEqual(formatTerrainDetailForPresentation(imarin, "spot_features"), { text: "砂浜", confidence: "medium" });
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(imarin, "parking")), "駐車");
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(imarin, "toilet")), "トイレ");
assert.match(formatSpotDetailValue(findDisplayableSpotDetail(imarin, "restriction_status")), /釣り可否は未確認/);

const override = haregi.values.find((value) => value.itemKey === "spot_features")!;
const oldCurated = {
  ...override,
  id: "old-database-value",
  informationState: "researched_unknown" as const,
  valueText: null,
  valueTextList: [],
  confidence: null,
  checkedAt: "2026-07-20",
};
const merged = mergeStaticSpotDetailOverrides(
  { itemDefinitions: runtime.itemDefinitions, values: [oldCurated] },
  { itemDefinitions: runtime.itemDefinitions, values: [override] },
);
assert.equal(merged.values[0].id, override.id, "new static re-research must replace old database curated value");

const approvedUserValue = {
  ...override,
  id: "approved-user-value",
  contributionOrigin: "user_contribution" as const,
  moderationStatus: "approved" as const,
  reviewStatus: "reviewed" as const,
  adoptionStatus: "adopted" as const,
};
const mergedWithApprovedUser = mergeStaticSpotDetailOverrides(
  { itemDefinitions: runtime.itemDefinitions, values: [oldCurated, approvedUserValue] },
  { itemDefinitions: runtime.itemDefinitions, values: [override] },
);
assert.equal(mergedWithApprovedUser.values[0].id, approvedUserValue.id, "approved user contribution keeps display priority");

const pendingUserValue = {
  ...approvedUserValue,
  id: "pending-user-value",
  moderationStatus: "pending" as const,
  reviewStatus: "pending_review" as const,
  adoptionStatus: "candidate" as const,
};
const mergedWithPendingUser = mergeStaticSpotDetailOverrides(
  { itemDefinitions: runtime.itemDefinitions, values: [oldCurated, pendingUserValue] },
  { itemDefinitions: runtime.itemDefinitions, values: [override] },
);
assert.equal(mergedWithPendingUser.values[0].id, override.id, "pending user contribution must not override curated re-research");
assert.ok(!mergedWithPendingUser.values.some((value) => value.id === pendingUserValue.id));

assert.match(fallbackSource, /issue284HizenDetails/);
assert.match(fallbackSource, /issue284ImariDetails/);
assert.match(repositorySource, /isStaticReresearchOverride/);
assert.match(repositorySource, /:issue\\d\+\$/);
assert.match(repositorySource, /remote database is not modified/);

console.log("Issue #284 Hizen and Imari east spot re-research tests passed");
