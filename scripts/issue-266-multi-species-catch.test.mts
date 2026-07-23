import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMemo, formFromMemo, validateForm, type FormState } from "../src/components/ExternalCatchMemoSection";
import { loadExternalCatchMemos, type ExternalCatchMemo } from "../src/lib/externalCatchMemoStorage";
import { mapExternalCatchMemoRow, mapExternalCatchMemoToUpsertPayload, type ExternalCatchMemoRow } from "../src/lib/externalCatchMemoMapper";

const section = readFileSync("src/components/ExternalCatchMemoSection.tsx", "utf8");
const dashboard = readFileSync("src/components/FishingDashboard.tsx", "utf8");
const map = readFileSync("src/components/FishingMap.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
assert.match(section, /<legend>釣れた魚/);
assert.doesNotMatch(section, /1つの釣果に、同じ場所・日時で釣れた魚をまとめて追加できます。/);
const basicInfoIndex = section.indexOf("<legend>基本情報</legend>");
const fishItemsIndex = section.indexOf("<legend>釣れた魚");
const memoIndex = section.indexOf("メモ <span className=\"optionalBadge\"");
const actionsIndex = section.indexOf("<div className=\"externalMemoActions\">");
assert.ok(basicInfoIndex < fishItemsIndex && fishItemsIndex < memoIndex && memoIndex < actionsIndex);
assert.match(section, /<h3>魚種 \{index \+ 1\}<\/h3>/);
assert.match(css, /\.externalMemoAddFish \{ width: 100%/);
assert.match(css, /\.externalMemoActions \{[\s\S]*?grid-template-columns: repeat\(2/);
assert.doesNotMatch(section, /魚種を登録|件を登録|魚種`|魚種\}/);
assert.match(section, /: "登録する"/);
assert.match(section, />キャンセル<\/button>/);
assert.match(section, /魚種明細を削除/);
assert.match(css, /\.externalMemoModal \{\s*position: relative/);
assert.match(css, /\.externalMemoClose \{[\s\S]*?position: absolute/);
assert.match(dashboard, /memo\.catchItems\.some/);
assert.match(map, /externalMemos\.flatMap[\s\S]*?return spot[\s\S]*?\[\s*\{/);

const form: FormState = {
  catchItems: [{ species: "アジ", catchCount: "5", sizeCm: "18" }, { species: "サバ", catchCount: "2", sizeCm: "25" }],
  caughtDateTime: "2026-07-23T08:30", method: "サビキ", spotId: "spot-1", userMemo: "朝まずめ",
};
const spot = { id: "spot-1", name: "呼子漁港", areaName: "唐津湾", latitude: 33, longitude: 130, spotType: "漁港" as const, shoreAccess: "足場良い" as const, targetSpecies: ["アジ" as const], recommendedMethods: ["サビキ" as const], notes: [], coordinatePrecision: "approximate" as const };
assert.deepEqual(validateForm(form), {});
const memo = createMemo(form, [spot]);
assert.equal(memo.id.startsWith("external-memo-"), true);
assert.equal(memo.catchItems.length, 2);
assert.equal(memo.areaName, "唐津湾");
assert.equal(memo.method, "サビキ");
assert.equal(memo.userMemo, "朝まずめ");
const payload = mapExternalCatchMemoToUpsertPayload(memo);
assert.equal(payload.id, memo.id);
assert.deepEqual(payload.catch_items, memo.catchItems);
assert.equal(payload.species, "アジ");
assert.equal(payload.catch_count, 5);
assert.equal(validateForm({ ...form, catchItems: [...form.catchItems, { species: "アジ", catchCount: "", sizeCm: "" }] }).catchItems, "同じ魚種は重複して登録できません。");

const row: ExternalCatchMemoRow = {
  id: "legacy", species: "アジ", catch_items: null, caught_date: "2026-01-01", caught_time: null, area_name: "唐津湾", estimated_spot_name: null, spot_id: "spot-1", latitude: null, longitude: null, coordinate_precision: "unknown", method: null, catch_count: 3, size_cm: "20", source_id: "user-self-report", source_name: "本人の釣果", source_url: "https://example.test", acquisition_method: "manual", confidence: "high", environment_match_notes: [], user_memo: null, owner_id: "owner", created_by: "authenticated_user", is_deleted: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};
const normalized = mapExternalCatchMemoRow(row)!;
assert.deepEqual(normalized.catchItems, [{ species: "アジ", catchCount: 3, sizeCm: 20 }]);
assert.equal(formFromMemo(normalized).catchItems.length, 1);
const legacyLocal = { ...normalized, catchItems: undefined } as unknown as ExternalCatchMemo;
const storage = { getItem: () => JSON.stringify([legacyLocal]), setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 1 } satisfies Storage;
assert.deepEqual(loadExternalCatchMemos(storage)[0].catchItems, [{ species: "アジ", catchCount: 3, sizeCm: 20 }]);
console.log("Issue #266 multi-species catch checks passed.");
