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
  "nokita-port", "nokita-beach", "keya-port", "keya-gate",
  "funakoshi-port", "kishi-port", "fukuyoshi-port", "kafuri-port",
  "fukae-port", "dainyu-port", "shikaka-port", "fukunoura-port",
] as const;

const files = [
  "data/curation/fishing-spots/issue-278-itoshima-detail-reresearch.json",
  "data/curation/fishing-spots/issue-278-itoshima-detail-reresearch-central.json",
  "data/curation/fishing-spots/issue-278-itoshima-detail-reresearch-south.json",
];
const curations = files.map((path) => JSON.parse(fs.readFileSync(path, "utf8")) as CuratedFile);
const spots = curations.flatMap(({ spots }) => spots);
const policy = fs.readFileSync("docs/FISHING_SPOT_DETAIL_EVIDENCE_POLICY.md", "utf8");
const fallbackSource = fs.readFileSync("src/lib/fishingSpotDetailFallback.ts", "utf8");
const repositorySource = fs.readFileSync("src/lib/fishingSpotDetailRepository.ts", "utf8");

assert.ok(curations.every(({ issue }) => issue === 278));
assert.deepEqual(new Set(spots.map(({ spotId }) => spotId)), new Set(TARGET_SPOTS));
assert.equal(spots.flatMap(({ values }) => values).length, 55);
assert.match(curations[0].researchPolicy.scoreGuard, /SCORE v2/);
assert.match(curations[0].researchPolicy.safetyGuard, /low 根拠だけで採用しない/);

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
    }
    for (const sourceId of [...value.sources.supporting, ...value.sources.checked, ...value.sources.contradicting]) {
      assert.ok(sourceIds.has(sourceId), `${spot.spotId}:${value.itemKey}: unknown source ${sourceId}`);
    }
    if (["restriction_status", "fishable_area"].includes(value.itemKey) && value.informationState === "weak_evidence") {
      assert.fail(`${spot.spotId}:${value.itemKey}: low evidence must not positively assert access or restrictions`);
    }
  }
}

const runtime = buildStaticFishingSpotDetailsFromSpots(fishingSpots);
for (const spotId of TARGET_SPOTS) {
  const curatedSpot = spots.find((spot) => spot.spotId === spotId)!;
  for (const itemKey of ["coastal_topography", "spot_features", "shore_access"]) {
    const expected = curatedSpot.values.find((value) => value.itemKey === itemKey);
    if (!expected) continue;
    const actual = findDisplayableSpotDetail(
      { itemDefinitions: runtime.itemDefinitions, values: runtime.values.filter((value) => value.spotId === spotId) },
      itemKey,
    );
    assert.ok(actual, `${spotId}:${itemKey}: latest re-research value must be displayable`);
    assert.equal(actual.id.endsWith(":issue278"), true);
    assert.equal(actual.informationState, expected.informationState);
    assert.equal(actual.confidence, expected.confidence);
    assert.deepEqual(actual.valueTextList, expected.valueTextList);
    assert.equal(actual.valueText, expected.valueText);
  }
}

const nokita: FishingSpotDetailSet = {
  itemDefinitions: runtime.itemDefinitions,
  values: runtime.values.filter((value) => value.spotId === "nokita-port"),
};
assert.equal(formatSpotDetailValue(findDisplayableSpotDetail(nokita, "shore_access")), "コンクリート主体・場所により高低差あり");
assert.deepEqual(formatTerrainDetailForPresentation(nokita, "spot_features"), { text: "堤防、岸壁", confidence: "low" });

const keyaGate: FishingSpotDetailSet = {
  itemDefinitions: runtime.itemDefinitions,
  values: runtime.values.filter((value) => value.spotId === "keya-gate"),
};
assert.deepEqual(formatTerrainDetailForPresentation(keyaGate, "spot_features"), { text: "磯", confidence: "low" });
assert.match(formatSpotDetailValue(findDisplayableSpotDetail(keyaGate, "spot_features")), /ゴロタ浜/);

const override = nokita.values.find((value) => value.itemKey === "spot_features")!;
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

const userValue = { ...override, id: "approved-user-value", contributionOrigin: "user_contribution" as const };
const mergedWithUser = mergeStaticSpotDetailOverrides(
  { itemDefinitions: runtime.itemDefinitions, values: [oldCurated, userValue] },
  { itemDefinitions: runtime.itemDefinitions, values: [override] },
);
assert.equal(mergedWithUser.values[0].id, userValue.id, "approved user contribution keeps display priority");

assert.match(fallbackSource, /issue278NorthDetails/);
assert.match(fallbackSource, /latestBySpotItem\.set/);
assert.match(repositorySource, /mergeStaticSpotDetailOverrides/);
assert.match(repositorySource, /remote database is not modified/);
assert.match(policy, /地点を直接特定できる民間単独資料/);
assert.match(policy, /SCORE v2へ入力しない/);

console.log("Issue #278 Itoshima spot re-research tests passed");
