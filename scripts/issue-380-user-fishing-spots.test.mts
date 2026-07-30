import assert from "node:assert/strict";
import fs from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots.ts";
import { markerKindForSpot } from "../src/domain/mapMarkerPresentation.ts";
import { buildMethodSpotSuitability } from "../src/domain/scoreV2Production.ts";
import { findDisplayableSpotDetail, findOwnerUserSpotDetail, formatOwnerUserSpotTerrainDetail, formatSpotDetailValue } from "../src/domain/spotEvaluationPresentation.ts";
import { buildUserSpotDetailInput, mapUserSpotDetailsForDisplay, mergeRuntimeFishingSpots, userFishingSpotDetailItemKeys, userFishingSpotTypeForDisplay, userFishingSpotTypes, userSpotRuntimeId, validateUserFishingSpotInput, type UserFishingSpot, type UserFishingSpotDetailValue } from "../src/domain/userFishingSpot.ts";

const migration = fs.readFileSync("supabase/migrations/20260730090000_issue_380_user_fishing_spots.sql", "utf8");
const repository = fs.readFileSync("src/lib/userFishingSpotRepository.ts", "utf8");
const minimal = validateUserFishingSpotInput({ name: "  自分の釣り場  ", latitude: 33.5, longitude: 129.8, areaName: null, spotType: null });
assert.deepEqual(minimal, { name: "自分の釣り場", latitude: 33.5, longitude: 129.8, areaName: null, spotType: null });
assert.equal(validateUserFishingSpotInput({ name: "x", latitude: 90.01, longitude: 0, areaName: null, spotType: null }), null);
assert.equal(validateUserFishingSpotInput({ name: "x", latitude: 0, longitude: -180.01, areaName: null, spotType: null }), null);
for (const spotType of userFishingSpotTypes) assert.equal(validateUserFishingSpotInput({ name: "x", latitude: 0, longitude: 0, areaName: null, spotType })?.spotType, spotType);
assert.equal(validateUserFishingSpotInput({ name: "x", latitude: 0, longitude: 0, areaName: null, spotType: "港" as never }), null, "arbitrary marker types are rejected");
assert.match(migration, /spot_type is null or spot_type in \('漁港', '堤防', 'サーフ', '地磯', '磯場', '河口', '湾岸', 'その他'\)/);
assert.equal(userFishingSpotTypeForDisplay(null), "その他", "NULL remains generic only at the display boundary");
assert.equal(markerKindForSpot({ id: "user:spot", spotType: userFishingSpotTypeForDisplay(null) }), "place");
assert.match(migration, /latitude numeric not null check \(latitude between -90 and 90\)/);
assert.match(migration, /longitude numeric not null check \(longitude between -180 and 180\)/);

assert.equal(userFishingSpotDetailItemKeys.length, 15);
for (const itemKey of userFishingSpotDetailItemKeys) assert.match(migration, new RegExp(`'${itemKey}'`));
assert.equal(buildUserSpotDetailInput("access", { checkedAt: "2026-07-30", note: "", isUnknown: false, textValue: "", listValue: [], numberValue: "" }), null, "omitted details produce no row");

const masterLikeId = fishingSpots[0].id;
const userSpot: UserFishingSpot = { id: masterLikeId, runtimeId: userSpotRuntimeId(masterLikeId), name: "個人地点", latitude: 33, longitude: 130, areaName: null, spotType: null, createdAt: "2026-07-30", updatedAt: "2026-07-30" };
const merged = mergeRuntimeFishingSpots(fishingSpots, [userSpot]);
assert.equal(merged.filter(({ source }) => source === "master").length, fishingSpots.length, "all master spots survive");
assert.equal(new Set(merged.map(({ id }) => id)).size, merged.length, "user IDs cannot collide at runtime");
assert.equal(merged.at(-1)?.areaName, null, "nullable data is not invented");

const detailValue = (itemKey: UserFishingSpotDetailValue["itemKey"], fields: Partial<UserFishingSpotDetailValue>): UserFishingSpotDetailValue => ({ id: itemKey, spotId: userSpot.id, itemKey, valueText: null, valueTextList: [], valueNumber: null, unit: null, checkedAt: "2026-07-30", note: null, updatedAt: "2026-07-30T00:00:00Z", ...fields });
const details = mapUserSpotDetailsForDisplay([
  detailValue("access", { valueText: "徒歩5分" }),
  detailValue("bottom_material", { valueTextList: ["砂", "岩"] }),
  detailValue("depth", { valueNumber: 12, unit: "m" }),
  detailValue("coastal_topography", { valueTextList: ["河口", "浅場"] }),
], []);
assert.deepEqual([details.values[0].contributionOrigin, details.values[0].moderationStatus, details.values[0].reviewStatus, details.values[0].adoptionStatus], ["user_contribution", "pending", "pending_review", "candidate"], "user details cannot become approved SCORE evidence");
assert.equal(formatSpotDetailValue(findOwnerUserSpotDetail(details, "access")), "徒歩5分", "owner can display text input");
assert.equal(formatSpotDetailValue(findOwnerUserSpotDetail(details, "bottom_material")), "砂、岩", "owner can display list input");
assert.equal(formatSpotDetailValue(findOwnerUserSpotDetail(details, "depth")), "12m", "owner can display number input");
assert.deepEqual(formatOwnerUserSpotTerrainDetail(details, "coastal_topography"), { text: "浅場、河口", confidence: "low" }, "owner terrain uses ordinary taxonomy formatting");
assert.equal(findDisplayableSpotDetail(details, "access"), undefined, "owner input does not enter the curated display path");
assert.equal(buildMethodSpotSuitability(details, "サビキ"), null, "owner input does not satisfy SCORE v2 approval");
const existingPending = { ...details, values: details.values.map((value) => ({ ...value, spotId: fishingSpots[0].id })) };
assert.equal(findOwnerUserSpotDetail(existingPending, "access"), undefined, "pending contributions on existing spots remain hidden");
assert.equal(findDisplayableSpotDetail(existingPending, "access"), undefined, "existing curated display behavior is unchanged");

for (const table of ["user_fishing_spots", "user_fishing_spot_detail_values"]) assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
assert.ok((migration.match(/owner_id = auth\.uid\(\)/g) ?? []).length >= 10, "all RLS operations are owner scoped");
assert.match(migration, /default auth\.uid\(\)/);
assert.match(migration, /foreign key \(user_spot_id, owner_id\)/);
assert.match(migration, /revoke all on public\.user_fishing_spots from anon/);
assert.doesNotMatch(repository, /owner_id\s*:/, "repository never writes a caller-selected owner");
assert.doesNotMatch(migration, /(?:update|delete from) public\.(?:fishing_spots|fishing_spot_detail_values|external_catch_memos)/i);
console.log("Issue #380 user fishing spot foundation checks passed");
