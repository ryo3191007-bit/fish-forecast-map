import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const migration = readFileSync("supabase/migrations/20260801090000_issue_395_field_report_history.sql", "utf8");
const repository = readFileSync("src/lib/userFishingSpotRepository.ts", "utf8");
const ui = readFileSync("src/components/UserSpotFieldReportSection.tsx", "utf8");
const hook = readFileSync("src/hooks/useUserFishingSpotDetails.ts", "utf8");
for (const required of ["user_fishing_spot_field_reports", "user_fishing_spot_field_report_values", "enable row level security", "owner_id = auth.uid()", "field_report_spot_owner_fk", "field_report_value_owner_fk", "snapshot_backfill", "group by user_spot_id, owner_id, checked_at", "security definer set search_path = ''", "jsonb_array_length(p_values) = 0", "duplicate item_key", "spot owner mismatch", "on conflict (user_spot_id, item_key) do update", "revoke all on function", "to authenticated"]) assert.ok(migration.includes(required), required);
assert.ok(!/grant execute[^;]+to anon/i.test(migration));
assert.match(migration, /create or replace function public\.create_my_user_fishing_spot_with_details[\s\S]+initial_details/);
assert.match(migration, /where excluded\.checked_at >= user_fishing_spot_detail_values\.checked_at/);
assert.match(migration, /for v_observed_on in[\s\S]+select distinct \(value->>'checked_at'\)::date[\s\S]+jsonb_agg\(value\)/);
const reports = [];
let snapshot = null;
for (const report of [{ observedOn: "2026-08-01", value: "new" }, { observedOn: "2026-07-01", value: "old" }]) {
  reports.push(report);
  if (!snapshot || report.observedOn >= snapshot.observedOn) snapshot = report;
}
assert.equal(reports.length, 2);
assert.deepEqual(snapshot, { observedOn: "2026-08-01", value: "new" });
assert.match(repository, /saveMyUserFishingSpotDetail[\s\S]+saveMyUserFishingSpotFieldReport/);
for (const missingCode of ["PGRST202", "PGRST205", "42P01"]) assert.ok(repository.includes(missingCode));
assert.match(repository, /saveMyUserFishingSpotDetail[\s\S]+isMissingSupabaseObject[\s\S]+user_fishing_spot_detail_values[\s\S]+upsert/);
assert.ok(!hook.includes("Promise.all"));
assert.ok(hook.includes('setStatus("ready")') && hook.includes('setReportStatus("unavailable")') || hook.includes('? "unavailable" : "failed"'));
assert.ok(ui.includes("＋ 現地調査を記録") && ui.includes("現地調査履歴") && ui.includes("selected.length === 0") && ui.includes("state.saveReport") && ui.includes("現在利用できません"));
console.log("Issue #395 field report history checks passed.");
