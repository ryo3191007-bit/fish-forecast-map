import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createMemo,
  formFromMemo,
  validateForm,
  type FormState,
} from "../src/components/ExternalCatchMemoSection";
import type { FishingSpot } from "../src/domain/fishingSpot";
import type { ExternalCatchMemo } from "../src/lib/externalCatchMemoStorage";
import { mapExternalCatchMemoRow, mapExternalCatchMemoToUpsertPayload, type ExternalCatchMemoRow } from "../src/lib/externalCatchMemoMapper";

const form = readFileSync("src/components/ExternalCatchMemoSection.tsx", "utf8");
const dashboard = readFileSync("src/components/FishingDashboard.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20260723160000_add_external_catch_memo_time.sql", "utf8");

assert.match(form, /type="datetime-local"/);
assert.doesNotMatch(form, /updateForm\("areaName"|updateForm\("estimatedSpotName"/);
assert.match(form, /form\.catchItems\.some\(\(item\) => !item\.species\)/);
assert.match(form, /if \(!form\.spotId\)/);
assert.match(form, /\(!editingMemo \|\| editingMemo\.caughtTime\) && !form\.caughtDateTime/);
assert.match(form, /areaName: selectedSpot\.areaName/);
assert.match(form, /estimatedSpotName: editingMemo\?\.estimatedSpotName/);
assert.match(form, /<time dateTime=\{memo\.caughtDate\}>\{memo\.caughtDate\}<\/time>/);
assert.doesNotMatch(form, /場所・ポイント名: \{memo\.estimatedSpotName/);
assert.match(dashboard, /caughtTime \?\? "00:00:00"/);
assert.match(migration, /add column if not exists caught_time time without time zone/);
assert.doesNotMatch(migration, /\bupdate\b|default/i);

const spot: FishingSpot = {
  id: "spot-1", name: "地図上の釣り場", areaName: "唐津湾", latitude: 0,
  longitude: 0, spotType: "堤防", shoreAccess: "不明", targetSpecies: [],
  recommendedMethods: [], coordinatePrecision: "exact",
};
const baseForm: FormState = {
  catchItems: [{ species: "アジ", catchCount: "2", sizeCm: "21.5" }],
  caughtDateTime: "", method: "", spotId: spot.id, userMemo: "更新後メモ",
};
const legacyMemo: ExternalCatchMemo = {
  id: "legacy-memo", species: "アジ", catchItems: [{ species: "アジ" }], caughtDate: "2026-07-20",
  areaName: "旧エリア", estimatedSpotName: "以前の自由入力", spotId: spot.id,
  coordinatePrecision: "unknown", sourceId: "user-self-report", sourceName: "本人の釣果",
  sourceUrl: "https://example.com", acquisitionMethod: "manual", confidence: "high",
  createdAt: "2026-07-20T10:00:00Z", updatedAt: "2026-07-20T10:00:00Z",
};

assert.equal(validateForm(baseForm).caughtDateTime, "釣果日時を入力してください。");
assert.equal(formFromMemo({ ...legacyMemo, caughtTime: "18:45:00" }).caughtDateTime, "2026-07-20T18:45");
assert.equal(formFromMemo(legacyMemo).caughtDateTime, "");
assert.equal(validateForm(baseForm, legacyMemo).caughtDateTime, undefined);
const preservedLegacyMemo = createMemo(baseForm, [spot], legacyMemo);
assert.equal(preservedLegacyMemo.caughtDate, "2026-07-20");
assert.equal(preservedLegacyMemo.caughtTime, undefined);
assert.equal(preservedLegacyMemo.estimatedSpotName, "以前の自由入力");
const datedLegacyMemo = createMemo(
  { ...baseForm, caughtDateTime: "2026-07-23T19:30" }, [spot], legacyMemo,
);
assert.equal(datedLegacyMemo.caughtDate, "2026-07-23");
assert.equal(datedLegacyMemo.caughtTime, "19:30");
assert.match(form, /const displayLocationName = linkedSpot\?\.name \?\? memo\.estimatedSpotName \?\? memo\.areaName/);
assert.match(form, /speciesLabels\.join\("・"\)/);
assert.match(form, /aria-label=\{`\$\{speciesLabels\.join\("・"\)\}の操作メニュー`\}/);

const row: ExternalCatchMemoRow = {
  id: "memo-1", species: "アジ", caught_date: "2026-07-23", caught_time: "18:45:00",
  area_name: "唐津湾", estimated_spot_name: "以前の自由入力", spot_id: "spot-1",
  latitude: null, longitude: null, coordinate_precision: "unknown", method: null,
  catch_count: 2, size_cm: "21.5", catch_items: null, source_id: "user-self-report", source_name: "本人の釣果",
  source_url: "https://example.com", acquisition_method: "manual", confidence: "high",
  environment_match_notes: [], user_memo: null, owner_id: null,
  created_by: "authenticated_user", is_deleted: false,
  created_at: "2026-07-23T10:00:00Z", updated_at: "2026-07-23T10:00:00Z",
};
const mapped = mapExternalCatchMemoRow(row);
assert.ok(mapped);
assert.equal(mapped.caughtDate, "2026-07-23");
assert.equal(mapped.caughtTime, "18:45:00");
assert.equal(mapped.estimatedSpotName, "以前の自由入力");
const payload = mapExternalCatchMemoToUpsertPayload(mapped);
assert.equal(payload.caught_time, "18:45:00");
assert.equal(payload.estimated_spot_name, "以前の自由入力");
assert.equal(mapExternalCatchMemoRow({ ...row, caught_time: null })?.caughtTime, undefined);
assert.equal(mapExternalCatchMemoToUpsertPayload({ ...mapped, caughtTime: undefined }).caught_time, null);

console.log("Issue #260 catch form, time persistence, legacy compatibility, and migration checks passed");
