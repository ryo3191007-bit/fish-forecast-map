import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const repository = await readFile(new URL("../src/lib/publicReadRepository.ts", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../src/components/FishingDashboard.tsx", import.meta.url), "utf8");
const activity = await readFile(new URL("../src/components/PublicSpotActivity.tsx", import.meta.url), "utf8");

for (const view of ["public_user_fishing_spots", "public_spot_field_reports", "public_spot_field_report_values", "public_catch_records"]) assert.match(repository, new RegExp(`from\\(\\"${view}\\"\\)`));
assert.doesNotMatch(repository, /owner_id|email|source_url|record_photos|storage_path/i);
assert.match(repository, /isMissingSupabaseObject/);
assert.match(repository, /ownedIds\.has\(id\)/);
assert.match(dashboard, /mergeOwnerAndPublicSpots/);
assert.match(activity, /確認日/);
assert.match(activity, /公開投稿/);
assert.match(activity, /excludedReportIds/);
assert.doesNotMatch(activity, /RecordPhoto|sourceUrl|latitude|longitude/);
console.log("Issue #398 public shared-record boundary checks passed.");
