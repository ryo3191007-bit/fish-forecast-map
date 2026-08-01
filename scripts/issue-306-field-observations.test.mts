import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildSaveSpotFieldObservationInput,
  formatSpotFieldObservationDate,
  formatSpotFieldObservationValue,
  spotFieldObservationConfigs,
  type SpotFieldObservation,
} from "../src/domain/spotFieldObservation";

assert.equal(formatSpotFieldObservationDate("2026-07-24"), "2026/7/24");

const observation: SpotFieldObservation = {
  id: "obs-1",
  spotId: "spot-1",
  itemKey: "parking",
  informationState: "weak_evidence",
  valueText: "駐車スペースを確認",
  valueTextList: [],
  valueNumber: null,
  unit: null,
  checkedAt: "2026-07-24",
  note: null,
  updatedAt: "2026-07-24T00:00:00Z",
};
assert.equal(formatSpotFieldObservationValue(observation), "駐車スペースを確認");
assert.equal(formatSpotFieldObservationValue({ ...observation, informationState: "researched_unknown", valueText: null }), "確認できず");

const parkingInput = buildSaveSpotFieldObservationInput("spot-1", "parking", spotFieldObservationConfigs.parking, {
  checkedAt: "2026-07-24",
  note: " 港入口横 ",
  isUnknown: false,
  textValue: "駐車スペースを確認",
  listValue: [],
  numberValue: "",
});
assert.deepEqual(parkingInput, {
  spotId: "spot-1",
  itemKey: "parking",
  informationState: "weak_evidence",
  valueText: "駐車スペースを確認",
  valueTextList: [],
  valueNumber: null,
  unit: null,
  checkedAt: "2026-07-24",
  note: "港入口横",
});

const unknownInput = buildSaveSpotFieldObservationInput("spot-1", "toilet", spotFieldObservationConfigs.toilet, {
  checkedAt: "2026-07-24",
  note: "",
  isUnknown: true,
  textValue: "あり",
  listValue: [],
  numberValue: "",
});
assert.equal(unknownInput?.informationState, "researched_unknown");
assert.equal(unknownInput?.valueText, null);

const restrictionOptions = spotFieldObservationConfigs.restriction_status.options ?? [];
assert.ok(restrictionOptions.includes("立入禁止看板"));
assert.ok(restrictionOptions.includes("釣り禁止看板"));
assert.ok(!restrictionOptions.includes("規制なし"));
assert.ok(!restrictionOptions.includes("立入可能"));
assert.ok(!restrictionOptions.includes("安全"));

const card = fs.readFileSync("src/components/SpotFieldObservationCard.tsx", "utf8");
const preliminaryIndex = card.indexOf(">事前調査<");
const dividerIndex = card.indexOf("styles.divider");
const fieldIndex = card.indexOf(">実地調査<");
assert.ok(preliminaryIndex >= 0 && preliminaryIndex < dividerIndex && dividerIndex < fieldIndex, "事前調査、罫線、実地調査の順で表示する");
assert.match(card, /確認日:\{formatSpotFieldObservationDate\(observation\.checkedAt\)\}/);
assert.match(card, /observation \? "編集" : "＋ 追加"/);
assert.match(card, /className=\{`\$\{styles\.topAction\}/, "追加・編集操作をカード右上用の要素として表示する");
assert.doesNotMatch(card, /styles\.actionRow/, "下部のアクション領域を表示しない");
assert.match(card, /window\.confirm\("この実地調査情報を削除しますか？"\)/);
assert.doesNotMatch(card, />自分の確認</);
assert.doesNotMatch(card, />調査情報</);

const cardStyles = fs.readFileSync("src/components/SpotFieldObservationCard.module.css", "utf8");
assert.match(cardStyles, /\.topAction\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*0\.8rem;[\s\S]*?right:\s*0\.8rem;/, "操作をカード右上に固定する");
assert.match(cardStyles, /\.cardTitle\s*\{[\s\S]*?min-height:\s*34px;[\s\S]*?padding-right:\s*76px;/, "タイトルと操作が重ならない余白を確保する");

const evaluationCard = fs.readFileSync("src/components/SpotEvaluationCard.tsx", "utf8");
assert.match(evaluationCard, /useSpotFieldObservations\(props\.selectedSpotId\)/);
assert.match(evaluationCard, /props\.activeTab === "釣場"[\s\S]*?fieldObservations=\{fieldObservations\}/);
assert.match(evaluationCard, /props\.activeTab === "地形"[\s\S]*?fieldObservations=\{fieldObservations\}/);
assert.match(evaluationCard, /props\.activeTab === "魚種"[\s\S]*?fieldObservations=\{fieldObservations\}/);
assert.match(evaluationCard, /<SpotFieldObservationCard[\s\S]*?itemKey="target_species"/);
assert.doesNotMatch(evaluationCard, /function EvaluationTab\(|calculateProductionScoreV2/, "the score evaluation route is removed from the user-facing card");

const repository = fs.readFileSync("src/lib/spotFieldObservationRepository.ts", "utf8");
assert.match(repository, /rpc\("get_my_spot_observations"/);
assert.match(repository, /rpc\("save_my_spot_observation"/);
assert.match(repository, /rpc\("delete_my_spot_observation"/);
assert.doesNotMatch(repository, /\.from\("fishing_spot_detail_values"\)\.(?:insert|update|delete)/, "browser code does not write the shared table directly");

const migration = fs.readFileSync("supabase/migrations/20260725230000_issue_306_field_observations.sql", "utf8");
assert.match(migration, /security definer[\s\S]*?set search_path = ''/);
assert.doesNotMatch(migration, /security definer[\s\S]*?set search_path = public/);
assert.match(migration, /v_user_id uuid := auth\.uid\(\)/);
assert.match(migration, /time zone 'Asia\/Tokyo'/);
assert.match(migration, /v_trimmed_text is null or v_trimmed_text <> all/);
assert.match(migration, /contribution_origin = 'user_contribution'/);
assert.match(migration, /'pending',[\s\S]*?'pending_review',[\s\S]*?'candidate'/);
assert.match(migration, /grant execute on function public\.save_my_spot_observation[\s\S]*?to authenticated/);
assert.doesNotMatch(migration, /grant (?:insert|update|delete) on .*fishing_spot_detail_values/i, "shared detail table remains non-writable from the client");
assert.doesNotMatch(migration, /create policy[\s\S]*pending/i, "pending observations are not exposed through the shared table select path");
assert.doesNotMatch(migration, /規制なし|立入可能|安全'/, "server allowlists cannot assert safe access or no restrictions");

console.log("Issue #306 field observation checks passed");
