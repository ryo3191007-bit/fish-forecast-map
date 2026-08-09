import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260809090000_issue_397_record_visibility.sql', 'utf8');
for (const table of ['user_fishing_spots', 'spot_field_reports', 'external_catch_memos']) {
  assert.match(migration, new RegExp(`alter table public\\.${table} add column visibility text not null default 'private'`));
}
for (const view of ['public_user_fishing_spots', 'public_spot_field_reports', 'public_spot_field_report_values', 'public_catch_records']) {
  assert.match(migration, new RegExp(`create view public\\.${view}`));
}
assert.match(migration, /select id, name, latitude, longitude, area_name/);
assert.doesNotMatch(migration.match(/create view public\.public_user_fishing_spots[\s\S]*?;/)?.[0] ?? '', /owner_id|email/);
assert.doesNotMatch(migration.match(/create view public\.public_catch_records[\s\S]*?;/)?.[0] ?? '', /owner_id|email|record_photos|storage_path/);
const publicCatchView = migration.match(/create view public\.public_catch_records[\s\S]*?;/)?.[0] ?? '';
assert.match(publicCatchView, /left join public\.user_fishing_spots user_spot on user_spot\.id = memo\.user_spot_id/);
for (const coordinate of ['latitude', 'longitude', 'coordinate_precision']) {
  assert.match(publicCatchView, new RegExp(`case when memo\\.user_spot_id is null or \\(user_spot\\.visibility = 'public' and not user_spot\\.is_deleted\\) then memo\\.${coordinate} end as ${coordinate}`));
}
assert.match(migration, /comment on view public\.public_catch_records/);
assert.doesNotMatch(migration, /comment on table public\.public_catch_records/);
assert.match(migration, /where visibility = 'public' and not is_deleted/);
assert.match(migration, /private Storage bucket,[\s\S]*photos stay owner-only/);

const spotUi = readFileSync('src/components/UserFishingSpotRegistrationModal.tsx', 'utf8');
assert.match(spotUi, /useState<RecordVisibility>\("private"\)/);
assert.match(spotUi, /正確な位置情報（緯度・経度）が他ユーザーに公開されます。/);
const catchUi = readFileSync('src/components/ExternalCatchMemoSection.tsx', 'utf8');
assert.match(catchUi, /visibility: "private"/);
const reportUi = readFileSync('src/components/UserSpotFieldReportSection.tsx', 'utf8');
assert.match(reportUi, /useState<RecordVisibility>\("private"\)/);
assert.match(reportUi, /const closeForm[^\n]+setVisibility\("private"\)/);
assert.match(reportUi, /useRef\(crypto\.randomUUID\(\)\)/);
assert.match(reportUi, /state\.saveReport\([^\n]+`\$\{spotId\}:\$\{idempotencyKey\.current\}`/);

const spotEvaluationUi = readFileSync('src/components/SpotEvaluationCard.tsx', 'utf8');
assert.match(spotEvaluationUi, /useState<RecordVisibility \| null>\(null\)/);
assert.match(spotEvaluationUi, /let active = true;[\s\S]*if \(active\) setSpotVisibility/);
assert.match(spotEvaluationUi, /return \(\) => \{ active = false; \}/);
assert.match(spotEvaluationUi, /spotVisibility === null && !spotVisibilityError \? <p role="status">地点の公開範囲を取得中です…<\/p>/);
assert.match(spotEvaluationUi, /disabled=\{spotVisibilityPending\}/);
assert.match(spotEvaluationUi, /spotVisibilityPendingRef\.current\) return/);
assert.match(spotEvaluationUi, /const targetSpotId = props\.selectedSpotId/);
assert.match(spotEvaluationUi, /selectedSpotIdRef\.current === targetSpotId\) setSpotVisibility\(next\)/);
assert.match(spotEvaluationUi, /selectedSpotIdRef\.current === targetSpotId\) setSpotVisibilityError/);
assert.doesNotMatch(spotEvaluationUi, /await updateMyUserFishingSpotVisibility\([^;]+;\s*setSpotVisibility\(next\)/);
assert.match(reportUi, /visibilityPendingRef\.current\.has\(reportId\)/);
assert.match(reportUi, /disabled=\{state\.isMutating \|\| visibilityPending\.has\(report\.id\)\}/);
assert.match(reportUi, /changeReportVisibility\(report\.id, event\.target\.value as RecordVisibility\)/);

const columnErrors = readFileSync('src/lib/supabaseObjectError.ts', 'utf8');
assert.match(columnErrors, /\["42703", "PGRST204"\]/);
assert.match(columnErrors, /message\.includes\(expectedColumn\.toLowerCase\(\)\)/);
for (const repository of ['src/lib/userFishingSpotRepository.ts', 'src/lib/spotFieldReportRepository.ts', 'src/lib/externalCatchMemoRepository.ts']) {
  const source = readFileSync(repository, 'utf8');
  assert.match(source, /isMissingSupabaseColumn\([^\n]+"visibility"\)/, `${repository} must limit compatibility fallback to a missing visibility column`);
}
const spotRepository = readFileSync('src/lib/userFishingSpotRepository.ts', 'utf8');
assert.match(spotRepository, /select\(legacySpotColumns\)/);
assert.match(spotRepository, /insert\(basePayload\)\.select\(legacySpotColumns\)/);
assert.match(spotRepository, /update\(basePayload\)[\s\S]*?select\(legacySpotColumns\)/);
const reportRepository = readFileSync('src/lib/spotFieldReportRepository.ts', 'utf8');
assert.match(reportRepository, /runQuery\(`id,target_type,spot_id,user_spot_id,observed_on,summary_note,origin,created_at,/);
assert.match(reportRepository, /p_idempotency_key: idempotencyKey/);
const catchRepository = readFileSync('src/lib/externalCatchMemoRepository.ts', 'utf8');
assert.match(catchRepository, /visibility: _omitted,[\s\S]*?compatibleMutation/);
console.log('Issue #397 private defaults, pre-migration compatibility, coordinate isolation, reset, and projection checks passed.');
