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
assert.match(migration, /where visibility = 'public' and not is_deleted/);
assert.match(migration, /private Storage bucket,[\s\S]*photos stay owner-only/);

const spotUi = readFileSync('src/components/UserFishingSpotRegistrationModal.tsx', 'utf8');
assert.match(spotUi, /useState<RecordVisibility>\("private"\)/);
assert.match(spotUi, /正確な位置情報（緯度・経度）が他ユーザーに公開されます。/);
const catchUi = readFileSync('src/components/ExternalCatchMemoSection.tsx', 'utf8');
assert.match(catchUi, /visibility: "private"/);
const reportUi = readFileSync('src/components/UserSpotFieldReportSection.tsx', 'utf8');
assert.match(reportUi, /useState<RecordVisibility>\("private"\)/);
console.log('Issue #397 private defaults, public projections, warning, and photo isolation checks passed.');
