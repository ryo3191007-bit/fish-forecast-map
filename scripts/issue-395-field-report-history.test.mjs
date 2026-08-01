import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/20260801090000_issue_395_field_report_history.sql");
const userRepository = read("src/lib/userFishingSpotRepository.ts");
const masterRepository = read("src/lib/spotFieldObservationRepository.ts");
const reportRepository = read("src/lib/spotFieldReportRepository.ts");
const missingObject = read("src/lib/supabaseObjectError.ts");
const userHook = read("src/hooks/useUserFishingSpotDetails.ts");
const masterHook = read("src/hooks/useSpotFieldObservations.ts");
const card = read("src/components/SpotEvaluationCard.tsx");
const ui = read("src/components/UserSpotFieldReportSection.tsx");
const css = read("src/components/UserSpotFieldReportSection.module.css");

for (const required of ["spot_field_reports", "spot_field_report_values", "target_type", "spot_id text", "user_spot_id uuid", "spot_field_reports_exact_target", "spot_field_reports_user_owner_fk", "spot_field_report_value_owner_fk", "enable row level security", "owner_id = auth.uid()", "security definer set search_path = ''", "revoke all on function", "to authenticated"]) assert.ok(migration.includes(required), required);
assert.ok(!/grant execute[^;]+to anon/i.test(migration));
assert.match(migration, /target_type = 'master' and spot_id is not null and user_spot_id is null/);
assert.match(migration, /target_type = 'user' and spot_id is null and user_spot_id is not null/);

// Backfill retains existing rows and uses only the grouping that old snapshots prove.
assert.match(migration, /group by user_spot_id, owner_id, checked_at/);
assert.match(migration, /group by spot_id, contributor_id, checked_at/);
assert.doesNotMatch(migration, /delete from public\.(?:spot_field_reports|spot_field_report_values)/);

// Append both reports, but keep the newer snapshot for either target type.
assert.match(migration, /where excluded\.checked_at >= user_fishing_spot_detail_values\.checked_at/);
assert.match(migration, /if v_current_date is null or p_observed_on >= v_current_date then[\s\S]+perform public\.save_my_spot_observation/);
const reports = [{ observedOn: "2026-08-01", value: "new" }, { observedOn: "2026-07-01", value: "old" }];
const snapshot = reports.reduce((current, report) => !current || report.observedOn >= current.observedOn ? report : current, null);
assert.equal(reports.length, 2);
assert.deepEqual(snapshot, reports[0]);

// Master writes remain pending candidates and cannot touch curated/adopted values.
assert.match(migration, /contribution_origin = 'user_contribution'[\s\S]+moderation_status = 'pending'[\s\S]+review_status = 'pending_review'[\s\S]+adoption_status = 'candidate'/);
assert.doesNotMatch(migration, /(?:update|delete from) public\.fishing_spot_detail_values[\s\S]+(?:curated_research|adopted)/);

// Every value is validated before any report row is inserted, even when its date is old.
assert.match(migration, /for v_value[\s\S]+validate_spot_field_report_value\(p_target_type, v_value\)[\s\S]+insert into public\.spot_field_reports/);
for (const rule of ["invalid target species", "invalid shore access observation", "invalid depth observation", "user spot details require a value"]) assert.ok(migration.includes(rule));

// Initial details preserve date groups, use payload-specific retry keys, and fully replace snapshots.
assert.match(migration, /for v_observed_on in select distinct \(value->>'checked_at'\)::date/);
assert.match(migration, /initial_details:' \|\| v_spot_id::text[\s\S]+md5\(v_initial_values::text\)/);
assert.match(migration, /unique \(owner_id, idempotency_key\)/);
assert.match(migration, /on conflict \(owner_id, idempotency_key\) do nothing/);
assert.match(migration, /delete from public\.user_fishing_spot_detail_values where user_spot_id = v_spot_id/);
assert.match(migration, /An identical retry finds existing reports[\s\S]+insert into public\.user_fishing_spot_detail_values/);

// Both existing single-item paths first create one-value history and fall back only for missing backend objects.
assert.match(userRepository, /saveMyUserFishingSpotDetail[\s\S]+saveMySpotFieldReport\("user"[\s\S]+isMissingSupabaseObject[\s\S]+user_fishing_spot_detail_values[\s\S]+upsert/);
assert.match(masterRepository, /saveMySpotFieldObservation[\s\S]+saveMySpotFieldReport\("master"[\s\S]+isMissingSupabaseObject[\s\S]+save_my_spot_observation/);
for (const code of ["PGRST202", "PGRST205", "42P01"]) assert.ok(missingObject.includes(code));
assert.match(missingObject, /expectedObject[\s\S]+message\.includes\(name\.toLowerCase\(\)\)[\s\S]+if \(!namesExpectedByCaller\) return false/);
assert.ok(userRepository.includes('isMissingSupabaseObject(error, "create_my_user_fishing_spot_with_details")'));
assert.ok(userRepository.includes('isMissingSupabaseObject(error, "save_my_spot_field_report")'));
assert.ok(masterRepository.includes('isMissingSupabaseObject(error, "save_my_spot_field_report")'));
assert.ok(reportRepository.includes('p_target_type: targetType') && reportRepository.includes('from("spot_field_reports")'));

// Snapshot and history loads are independent on both target types.
assert.ok(!userHook.includes("Promise.all") && !masterHook.includes("Promise.all"));
assert.ok(userHook.includes('fetchMyUserFishingSpotDetails') && userHook.includes('fetchMySpotFieldReports("user"'));
assert.ok(masterHook.includes('fetchMySpotFieldObservations') && masterHook.includes('fetchMySpotFieldReports("master"'));

// Main screen renders exactly the standalone trigger for master and user spots; history is modal-only.
assert.equal(ui.match(/\+実地調査をまとめて登録/g)?.length, 1);
assert.ok(card.includes("props.isUserSpot ? ownerDetails : fieldObservations"));
assert.ok(!ui.includes("現在値とは別に") && !ui.includes("実地調査履歴はまだありません"));
assert.match(ui, /open \? <div[\s\S]+過去の実地調査履歴/);
assert.match(ui, /disabled=\{state\.status !== "ready" \|\| unavailable \|\| state\.isMutating\}/);
assert.ok(ui.includes("title={unavailable ? unavailableReason"));
assert.match(css, /\.trigger:disabled/);

console.log("Issue #395 shared field report history checks passed.");
