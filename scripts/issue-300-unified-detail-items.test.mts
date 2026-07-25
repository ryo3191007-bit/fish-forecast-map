import assert from "node:assert/strict";
import fs from "node:fs";
import type {
  FishingSpotDetailSet,
  SpotDetailValue,
} from "../src/domain/fishingSpotDetail";
import {
  fishingDetailItems,
  resolveSpotDetailUiPresentation,
  terrainDetailItems,
} from "../src/domain/spotDetailUiPresentation";

function value(
  itemKey: string,
  overrides: Partial<SpotDetailValue> = {},
): SpotDetailValue {
  return {
    id: `value:${itemKey}`,
    spotId: "spot",
    itemKey,
    informationState: "has_evidence",
    valueText: null,
    valueTextList: [],
    valueNumber: null,
    valueBoolean: null,
    valueJson: null,
    unit: null,
    confidence: "medium",
    contributionOrigin: "curated_research",
    contributorId: null,
    submittedAt: null,
    moderationStatus: "not_required",
    reviewStatus: "reviewed",
    adoptionStatus: "adopted",
    note: null,
    checkedAt: "2026-07-25",
    sources: [],
    ...overrides,
  };
}

function details(...values: SpotDetailValue[]): FishingSpotDetailSet {
  return { itemDefinitions: [], values };
}

assert.deepEqual(
  fishingDetailItems.map(([, label]) => label),
  [
    "対象魚種",
    "推奨釣法",
    "足場",
    "トイレ",
    "常夜灯・照明",
    "駐車場",
    "アクセス情報",
    "釣り可能範囲",
    "釣り禁止・立入禁止・工事・閉鎖等",
  ],
);
assert.equal(fishingDetailItems.length, 9);

assert.deepEqual(
  terrainDetailItems.map(([, label]) => label),
  [
    "水深",
    "底質",
    "海底・沿岸地形",
    "テトラ・根・障害物",
    "釣り場の構造・足場",
    "潮通し",
    "河川影響",
    "外海・湾内特性",
  ],
);
assert.equal(terrainDetailItems.length, 8);

assert.deepEqual(resolveSpotDetailUiPresentation(null, "toilet"), {
  text: "未確定",
  confidence: null,
  state: "uncertain",
});
assert.equal(
  resolveSpotDetailUiPresentation(
    details(value("toilet", { informationState: "unresearched" })),
    "toilet",
  ).text,
  "未確定",
);
assert.equal(
  resolveSpotDetailUiPresentation(
    details(value("toilet", { informationState: "researched_unknown" })),
    "toilet",
  ).text,
  "未確定",
);

assert.deepEqual(
  resolveSpotDetailUiPresentation(
    details(
      value("toilet", {
        informationState: "weak_evidence",
        confidence: "low",
        valueBoolean: true,
      }),
    ),
    "toilet",
  ),
  { text: "トイレ", confidence: "low", state: "displayable" },
  "weak_evidence / low stays visible with the low-confidence badge",
);
assert.deepEqual(
  resolveSpotDetailUiPresentation(
    details(value("toilet", { confidence: "low", valueBoolean: true })),
    "toilet",
  ),
  { text: "トイレ", confidence: "low", state: "displayable" },
  "low confidence does not hide an otherwise displayable adopted value",
);

assert.deepEqual(
  resolveSpotDetailUiPresentation(
    details(value("toilet", { valueBoolean: false, confidence: "high" })),
    "toilet",
  ),
  { text: "なし", confidence: "high", state: "displayable" },
);
assert.deepEqual(
  resolveSpotDetailUiPresentation(
    details(value("toilet", { valueBoolean: true, confidence: "medium" })),
    "toilet",
  ),
  { text: "トイレ", confidence: "medium", state: "displayable" },
);
assert.equal(
  resolveSpotDetailUiPresentation(
    details(value("open_sea_bay_character", { valueText: "inner_bay" })),
    "open_sea_bay_character",
  ).text,
  "内湾",
);
assert.equal(
  resolveSpotDetailUiPresentation(
    details(value("depth", { valueNumber: 5, unit: "m" })),
    "depth",
  ).text,
  "5m",
);

assert.deepEqual(
  resolveSpotDetailUiPresentation(
    details(value("river_influence", { valueText: "not_applicable", confidence: "high" })),
    "river_influence",
  ),
  { text: "該当なし", confidence: "high", state: "not_applicable" },
);
assert.equal(
  resolveSpotDetailUiPresentation(
    details(value("river_influence", { valueText: "該当なし" })),
    "river_influence",
  ).text,
  "該当なし",
);
assert.notEqual(
  resolveSpotDetailUiPresentation(
    details(value("river_influence", { valueText: "none" })),
    "river_influence",
  ).text,
  "該当なし",
  "confirmed absence is not automatically converted to not-applicable",
);

assert.deepEqual(
  resolveSpotDetailUiPresentation(
    details(
      value("coastal_topography", {
        informationState: "weak_evidence",
        confidence: "low",
        valueTextList: ["砂地"],
      }),
    ),
    "coastal_topography",
  ),
  { text: "砂地", confidence: "low", state: "displayable" },
  "terrain weak evidence stays visible with low confidence",
);
assert.deepEqual(
  resolveSpotDetailUiPresentation(
    details(
      value("coastal_topography", {
        valueTextList: ["砂地"],
        confidence: "medium",
      }),
    ),
    "coastal_topography",
  ),
  { text: "砂地", confidence: "medium", state: "displayable" },
);

const rawWeakValue = value("parking", {
  informationState: "weak_evidence",
  confidence: "low",
  valueText: "駐車場候補（現行未確認）",
  note: "internal research note",
});
const before = structuredClone(rawWeakValue);
const weakPresentation = resolveSpotDetailUiPresentation(details(rawWeakValue), "parking");
assert.deepEqual(rawWeakValue, before, "presentation must not rewrite internal research state");
assert.equal(weakPresentation.text, "駐車");
assert.equal(weakPresentation.confidence, "low");

const card = fs.readFileSync("src/components/SpotEvaluationCard.tsx", "utf8");
assert.match(card, /items\.map\(\(\[key, label\]\) =>/);
assert.match(card, /resolveSpotDetailUiPresentation\(details, key\)/);
assert.doesNotMatch(
  card,
  /if \(!item && !terrainPresentation\) return \[\]/,
  "missing detail values must no longer remove common rows",
);
assert.match(card, /items=\{fishingDetailItems\}/);
assert.match(card, /items=\{terrainDetailItems\}/);
assert.match(card, /信憑性: \{confidenceLabel\[presentation\.confidence\]\}/);

console.log("Issue #300 unified spot detail item tests passed");
