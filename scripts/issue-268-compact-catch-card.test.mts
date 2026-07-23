import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCatchMeasurements,
  buildMultipleCatchSummary,
  formatCaughtDateTime,
} from "../src/components/ExternalCatchMemoSection";
import type { ExternalCatchMemo } from "../src/lib/externalCatchMemoStorage";

const section = readFileSync("src/components/ExternalCatchMemoSection.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const card = section.slice(
  section.indexOf("function ExternalMemoCard"),
  section.indexOf("type CatchMeasurement"),
);

for (const removedText of [
  "自分で記録した釣果です。",
  "メモあり",
  "詳細を開く",
  "詳細を閉じる",
  "地図上の釣り場:",
  "に紐づけ",
  "自分の釣果",
]) {
  assert.doesNotMatch(card, new RegExp(removedText));
}
assert.match(card, /aria-haspopup="menu"/);
assert.match(card, /aria-expanded=\{isMenuOpen\}/);
assert.match(card, /role="menuitem"[\s\S]*?>編集<\/button>/);
assert.match(card, /role="menuitem"[\s\S]*?>削除<\/button>/);
assert.match(card, /window\.confirm\("この釣果を削除します。よろしいですか？"\)/);
assert.match(card, /event\.stopPropagation\(\)/);
assert.match(card, /aria-controls=\{isMultipleSpecies \? detailsId/);
assert.match(card, /isMultipleSpecies && isExpanded/);
assert.match(card, /linkedSpot\.areaName/);
assert.doesNotMatch(card, /memo\.userMemo/);
assert.match(css, /\.externalMemoCard \{[\s\S]*?min-width: 0/);
assert.match(css, /@media \(max-width: 420px\)[\s\S]*?\.externalMemoCard/);
assert.match(css, /\.externalMemoMenuPopover \{[\s\S]*?right: 0/);
assert.match(card, /isMultipleSpecies \? "isMultiple" : "isSingle"/);
assert.match(card, /<FishSilhouette key=/);
assert.match(css, /\.externalMemoFishIcon\.isSingle \.externalMemoFishSilhouette/);
assert.match(css, /\.externalMemoFishIcon\.isMultiple \.externalMemoFishSilhouette/);
assert.match(css, /@media \(max-width: 420px\)[\s\S]*?grid-template-columns: 40px minmax\(0, 1fr\)/);

assert.equal(formatCaughtDateTime("2026-07-24", "11:33:00"), "2026-07-24 11:33");
assert.equal(formatCaughtDateTime("2026-07-24", "11:33"), "2026-07-24 11:33");
assert.equal(formatCaughtDateTime("2026-07-24"), "2026-07-24");
assert.doesNotMatch(formatCaughtDateTime("2026-07-24"), /00:00/);

assert.equal(buildCatchMeasurements({ species: "アジ", catchCount: 1, sizeCm: 45 }), "1匹 / 45cm");
assert.equal(buildCatchMeasurements({ species: "アジ", catchCount: 0 }), "0匹");
assert.equal(buildCatchMeasurements({ species: "アジ", sizeCm: 0 }), "0cm");
assert.equal(buildCatchMeasurements({ species: "アジ" }), "");

const memo = {
  catchItems: [
    { species: "アジ", catchCount: 5, sizeCm: 18 },
    { species: "サバ", catchCount: undefined, sizeCm: 25 },
    { species: "メバル", catchCount: 0, sizeCm: 20 },
  ],
} as ExternalCatchMemo;
assert.equal(buildMultipleCatchSummary(memo), "3魚種 ・ 5匹");
assert.equal(
  buildMultipleCatchSummary({ ...memo, catchItems: memo.catchItems.map(({ species }) => ({ species })) }),
  "3魚種",
);

console.log("Issue #268 compact catch card checks passed.");
