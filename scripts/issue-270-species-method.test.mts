import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMemo, formFromMemo, type FormState } from "../src/components/ExternalCatchMemoSection";
import { normalizeCatchItems } from "../src/lib/externalCatchMemoStorage";
import { mapExternalCatchMemoRow, mapExternalCatchMemoToUpsertPayload, type ExternalCatchMemoRow } from "../src/lib/externalCatchMemoMapper";

const section = readFileSync("src/components/ExternalCatchMemoSection.tsx", "utf8");
const dashboard = readFileSync("src/components/FishingDashboard.tsx", "utf8");
assert.doesNotMatch(section, /externalMemoLaunch/);
assert.doesNotMatch(section, /自分の釣果を記録/);
assert.match(dashboard, /sectionHeading[\s\S]*?釣果情報一覧[\s\S]*?catchReportRegisterButton[\s\S]*?釣果を登録/);
assert.match(dashboard, /handleRegistrationRequest = useCallback\(\(\) => setIsRegistrationRequested\(true\)/);
assert.match(dashboard, /handleRegistrationRequestHandled = useCallback\(\(\) => setIsRegistrationRequested\(false\)/);
assert.match(dashboard, /onClick=\{handleRegistrationRequest\}>釣果を登録/);
assert.match(dashboard, /isRegistrationRequested=\{isRegistrationRequested\}[\s\S]*?onRegistrationRequestHandled=\{handleRegistrationRequestHandled\}/);
assert.match(section, /if \(!isRegistrationRequested\) return;[\s\S]*?openNew\(\);[\s\S]*?onRegistrationRequestHandled\(\);/);
assert.doesNotMatch(dashboard, /openRegistrationRequest/);
assert.match(section, /event\.key === "Escape"\) closeModal\(\)/);
assert.match(section, /className="externalMemoOverlay"[\s\S]*?onMouseDown=\{closeModal\}/);
assert.match(section, /onEdit=\{openEdit\}/);
assert.match(section, /aria-label="釣果入力をキャンセル">キャンセル<\/button>/);
const basic = section.slice(section.indexOf("<legend>基本情報"), section.indexOf("<legend>釣れた魚"));
assert.doesNotMatch(basic, /釣り方/);
assert.match(section, /value=\{item\.method\}[\s\S]*?methodOptions\.map/);

const legacy = normalizeCatchItems([{ species: "アジ" }, { species: "サバ", method: "ジギング" }], { method: "サビキ" });
assert.deepEqual(legacy.map((item) => item.method), ["サビキ", "ジギング"]);
assert.equal(normalizeCatchItems([{ species: "アジ", method: "危険な値" }], { method: "不正" })[0].method, undefined);

const form: FormState = {
  catchItems: [
    { species: "アジ", method: "サビキ", catchCount: "3", sizeCm: "18" },
    { species: "サバ", method: "ジギング", catchCount: "1", sizeCm: "25" },
  ],
  caughtDateTime: "2026-07-23T08:30",
  spotId: "spot-1",
  userMemo: "",
};
const spot = { id: "spot-1", name: "港", areaName: "唐津湾", latitude: 33, longitude: 130, spotType: "漁港" as const, shoreAccess: "足場良い" as const, targetSpecies: [], recommendedMethods: [], notes: [], coordinatePrecision: "approximate" as const };
const memo = createMemo(form, [spot]);
assert.equal(memo.catchItems.length, 2);
assert.deepEqual(memo.catchItems.map((item) => item.method), ["サビキ", "ジギング"]);
assert.equal(memo.method, "サビキ");
assert.deepEqual(formFromMemo(memo).catchItems.map((item) => item.method), ["サビキ", "ジギング"]);
assert.deepEqual(mapExternalCatchMemoToUpsertPayload(memo).catch_items, memo.catchItems);

const row = {
  id: "legacy", species: "アジ", catch_items: [{ species: "アジ" }, { species: "サバ", method: "ジギング" }], caught_date: "2026-01-01", caught_time: null, area_name: "唐津湾", estimated_spot_name: null, spot_id: "spot-1", latitude: null, longitude: null, coordinate_precision: "unknown", method: "サビキ", catch_count: null, size_cm: null, source_id: "self", source_name: "本人", source_url: "https://example.test", acquisition_method: "manual", confidence: "high", environment_match_notes: [], user_memo: null, owner_id: "owner", created_by: "authenticated_user", is_deleted: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
} satisfies ExternalCatchMemoRow;
assert.deepEqual(mapExternalCatchMemoRow(row)?.catchItems.map((item) => item.method), ["サビキ", "ジギング"]);
assert.match(section, /!isMultipleSpecies && memo\.catchItems\[0\]\.method/);
assert.match(section, /item\.method \? <span className="externalMemoMethod">/);
console.log("Issue #270 species-specific method checks passed.");
