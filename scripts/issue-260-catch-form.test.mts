import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapExternalCatchMemoRow, mapExternalCatchMemoToUpsertPayload, type ExternalCatchMemoRow } from "../src/lib/externalCatchMemoMapper";

const form = readFileSync("src/components/ExternalCatchMemoSection.tsx", "utf8");
const dashboard = readFileSync("src/components/FishingDashboard.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20260723160000_add_external_catch_memo_time.sql", "utf8");

assert.match(form, /type="datetime-local"/);
assert.doesNotMatch(form, /updateForm\("areaName"|updateForm\("estimatedSpotName"/);
assert.match(form, /if \(!form\.species\)/);
assert.match(form, /if \(!form\.spotId\)/);
assert.match(form, /if \(!form\.caughtDateTime\)/);
assert.match(form, /areaName: selectedSpot\.areaName/);
assert.match(form, /estimatedSpotName: editingMemo\?\.estimatedSpotName/);
assert.match(form, /釣果日時:[\s\S]*memo\.caughtTime/);
assert.doesNotMatch(form, /場所・ポイント名: \{memo\.estimatedSpotName/);
assert.match(dashboard, /caughtTime \?\? "00:00:00"/);
assert.match(migration, /add column if not exists caught_time time without time zone/);
assert.doesNotMatch(migration, /\bupdate\b|default/i);

const row: ExternalCatchMemoRow = {
  id: "memo-1", species: "アジ", caught_date: "2026-07-23", caught_time: "18:45:00",
  area_name: "唐津湾", estimated_spot_name: "以前の自由入力", spot_id: "spot-1",
  latitude: null, longitude: null, coordinate_precision: "unknown", method: null,
  catch_count: 2, size_cm: "21.5", source_id: "user-self-report", source_name: "本人の釣果",
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
