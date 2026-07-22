import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const loadedModule = { exports: {} }; cache.set(path, loadedModule);
  const output = ts.transpileModule(readFileSync(join(process.cwd(), path), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function("exports", "require", "module", output)(loadedModule.exports, (specifier) => {
    if (specifier.startsWith("@/")) return load(`src/${specifier.slice(2)}.ts`);
    if (specifier.startsWith(".")) { const resolved = normalize(join(dirname(path), specifier)); return load(extname(resolved) ? resolved : `${resolved}.ts`); }
    return require(specifier);
  }, loadedModule);
  return loadedModule.exports;
}

const card = readFileSync(new URL("../src/components/SpotEvaluationCard.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../src/components/FishingDashboard.tsx", import.meta.url), "utf8");
const allSpeciesScreen = readFileSync(new URL("../src/components/AllSpeciesEvaluation.tsx", import.meta.url), "utf8");
const presentation = load("src/domain/spotEvaluationPresentation.ts");

assert.equal((dashboard.match(/<SpotEvaluationCard\b/g) ?? []).length, 1, "spot evaluation mode renders exactly one integrated card");
assert.ok(!dashboard.includes("legacySpotEvaluations") && !dashboard.includes("areaEvaluations"), "legacy aggregate evaluation cards and their calculation are removed");
assert.ok(!dashboard.includes("EnvironmentPanel"), "the standalone environment card is not rendered");
assert.equal(existsSync(new URL("../src/components/EnvironmentPanel.tsx", import.meta.url)), false, "the unused standalone environment component is removed");

const forecastRows = [
  { forecastTime: "2026-07-20T09:00" },
  { forecastTime: "2026-07-20T12:00" },
  { forecastTime: "2026-07-21T09:00" },
];
const now = new Date("2026-07-20T02:20:00Z"); // 11:20 JST
assert.equal(presentation.resolveSelectedForecastTime(forecastRows, "2026-07-20T09:00", now), "2026-07-20T09:00", "a valid selection is retained");
assert.equal(presentation.resolveSelectedForecastTime(forecastRows, null, now), "2026-07-20T12:00", "an unset selection uses the nearest valid row");
assert.equal(presentation.resolveSelectedForecastTime(forecastRows, "2026-07-19T09:00", now), "2026-07-20T12:00", "a time missing after a spot change is corrected");
assert.equal(presentation.resolveSelectedForecastTime(forecastRows, "2026-08-01T09:00", now), "2026-07-20T12:00", "an out-of-range date is corrected");
assert.equal(presentation.resolveSelectedForecastTime([], "2026-07-20T12:00", now), null, "no rows produce no UI selection");
assert.equal(presentation.getEvaluationReferenceTime(null, now), "2026-07-20T11:00", "scoring has an internal reference time independent of the UI selection");

const value = (spotId, valueText) => ({ spotId, informationState: "has_evidence", valueText, valueTextList: [], valueNumber: null, valueBoolean: null });
const mixedDetails = { itemDefinitions: [], values: [value("old", "open_sea"), value("new", "fishing_port")] };
assert.equal(presentation.scopeSpotDetails(mixedDetails, "new").values.length, 1);
assert.equal(presentation.scopeSpotDetails(mixedDetails, "new").values[0].valueText, "fishing_port");
assert.equal(presentation.scopeSpotDetails(mixedDetails, "missing"), null, "loading or failed selection cannot retain old details");
assert.equal(presentation.formatSpotDetailValue(value("new", "open_sea")), "外海");
assert.equal(presentation.formatSpotDetailValue(value("new", "fishing_port")), "漁港");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", "none"), itemKey: "river_influence" }), "河川の影響なし");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", "weak"), itemKey: "river_influence" }), "河川の影響が弱い");
for (const [enumValue, label] of Object.entries({ open_sea: "外海", bay_mouth: "湾口", bay: "湾内", inner_bay: "内湾" })) {
  assert.equal(presentation.formatSpotDetailValue({ ...value("new", enumValue), itemKey: "open_sea_bay_character" }), label);
}
assert.equal(presentation.formatSpotDetailValue({ ...value("new", "none"), itemKey: "open_sea_bay_character" }), "その他の確認済み情報", "enum labels are selected by item key and value together");
assert.equal(presentation.formatSpotDetailValue(value("new", "unknown_internal_code")), "その他の確認済み情報");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", null), informationState: "researched_unknown" }), "調査済み・未確定");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", null), informationState: "unresearched" }), "未調査");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", null), informationState: "rejected" }), "調査済み・不採用");
assert.equal(presentation.formatSpotDetailValue(undefined), "未調査", "a missing row is not presented as a confirmed absence");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", "トイレ候補（現行未確認）"), itemKey: "toilet", informationState: "weak_evidence", confidence: "low" }), "トイレ");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", "駐車場候補（現行未確認）"), itemKey: "parking", informationState: "weak_evidence", confidence: "low" }), "駐車");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", null), itemKey: "toilet", valueBoolean: true }), "トイレ");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", null), itemKey: "parking", valueBoolean: true }), "駐車");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", null), itemKey: "toilet", valueBoolean: false }), "なし");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", null), itemKey: "parking", valueBoolean: false }), "なし");
assert.equal(presentation.formatSpotDetailValue({ ...value("new", "none"), itemKey: "toilet" }), "なし", "a negative facility enum is not converted into an affirmative label");
const visibilityDetails = { itemDefinitions: [], values: [
  { ...value("new", "参考値"), itemKey: "target_species", adoptionStatus: "adopted", confidence: "low" },
  { ...value("new", "非表示"), itemKey: "parking", adoptionStatus: "adopted", informationState: "rejected" },
] };
assert.equal(presentation.findDisplayableSpotDetail(visibilityDetails, "target_species").confidence, "low", "adopted low-confidence evidence remains visible");
assert.equal(presentation.findDisplayableSpotDetail(visibilityDetails, "target_species").informationState, "has_evidence", "display lookup does not promote low-confidence evidence or rewrite its state");
assert.equal(presentation.findDisplayableSpotDetail(visibilityDetails, "parking"), undefined, "rejected evidence is excluded from the normal UI");
assert.notEqual(presentation.formatSpotDetailValue(visibilityDetails.values[1]), "未調査", "rejected evidence retains its state instead of being converted to unresearched");
assert.ok(card.includes("items.flatMap") && card.includes("if (!item && !terrainPresentation) return []"), "detail rows without displayable adopted evidence are omitted");
assert.ok(card.includes('["fishable_area", "釣り可能範囲"]') && !card.includes('["fishing_range", "釣り可能範囲"]'), "the fishing tab uses the split fishable-area key");
for (const key of ["tidal_flow", "river_influence", "open_sea_bay_character"]) assert.ok(card.includes(`["${key}",`), `the terrain tab displays ${key} independently`);
assert.ok(!card.includes('["water_flow_influences",'), "the legacy composite is absent from the normal UI");

const environment = (cacheStatus, fetchStatus, warning = null) => ({ cacheStatus, fetchStatus, warning });
assert.equal(presentation.getEnvironmentStatusLabel(environment("fresh", "success"), null), "最新データ");
assert.equal(presentation.getEnvironmentStatusLabel(environment("cache-fresh", "success"), null), "キャッシュ");
assert.match(presentation.getEnvironmentStatusLabel(environment("cache-stale", "success"), null), /^古いキャッシュ/);
assert.equal(presentation.getEnvironmentStatusLabel(environment("fresh", "partial"), null), "一部データのみ");
assert.equal(presentation.getEnvironmentStatusLabel(environment("none", "failed"), null), "取得失敗");
assert.equal(presentation.getEnvironmentStatusLabel(environment("cache-fresh", "failed"), "更新失敗"), "キャッシュ（API更新失敗）");

const renderedValues = [presentation.formatSpotDetailValue({ ...value("new", "open_sea"), sourceName: "secret", sourceUrl: "https://secret.test", note: "internal" })];
assert.ok(!JSON.stringify(renderedValues).includes("secret") && !JSON.stringify(renderedValues).includes("internal"), "source URL and internal note are excluded from display values");
assert.ok(dashboard.includes("setSpotDetails(null)"), "spot changes clear previous details immediately");
assert.ok(dashboard.includes('setSpotDetailStatus("loading")') && dashboard.includes('setSpotDetailStatus("failed")'), "detail loading and failure are explicit");
assert.ok(card.includes("getEvaluationReferenceTime(props.selectedTime)"), "spot scoring remains available without a UI forecast selection");
assert.ok(card.includes('display.kind === "loading" || display.kind === "hidden"'), "loading, clear, and out-of-range do not render a JMA panel");
assert.ok(card.includes('className="jmaWarningUnavailable"') && card.includes("{display.message}"), "unknown renders only the presentation policy's compact message");
assert.ok(!card.includes("unknownReason") && !card.includes("lastSuccessfulFetchAt"), "internal unknown details are absent from the normal UI");
for (const label of ["対象区域", "現象", "電文", "発表時刻", "対象時間帯", "出典:"]) assert.ok(card.includes(label), `blocked detail retains ${label}`);
const unavailableRule = css.match(/\.jmaWarningUnavailable\s*\{[^}]+\}/)?.[0] ?? "";
assert.match(unavailableRule, /padding:\.35rem 0/);
assert.match(unavailableRule, /line-height:1\.4/);
assert.ok(!/min-height|(?:^|[;{])\s*height:/.test(unavailableRule), "the mobile unknown message has no forced excessive height");
assert.ok(card.includes('props.detailStatus === "ready" ? scopeSpotDetails'), "only ready, matching details enter scoring");

const result = (species, informationStatus, overallScore, spotCompatibilityScore) => ({ species, informationStatus, overallScore, spotCompatibilityScore });
const original = [
  result("根魚", "no_information", null, null),
  result("シーバス", "reference_only", null, 55),
  result("アジ", "available", 72, 70),
  result("チヌ", "partial", 81, 65),
  result("サバ", "reference_only", null, 68),
  ...["イワシ", "青物", "シイラ", "ヒラメ", "マゴチ", "アオリイカ", "ヤリイカ", "コウイカ", "真鯛", "キス"].map((name) => result(name, "no_information", null, null)),
];
const sorted = presentation.sortAllSpeciesResults(original);
assert.equal(sorted.length, 15, "all 15 SCORE v2 species are retained");
assert.deepEqual(sorted.slice(0, 4).map((item) => item.species), ["チヌ", "アジ", "サバ", "シーバス"], "scored then unscored groups each use their specified descending score");
assert.ok(sorted.slice(4).every((item) => item.informationStatus === "no_information"), "no-information entries follow scored and unscored entries instead of being treated as zero");
assert.deepEqual(presentation.filterSpeciesResults(sorted, "イカ").map((item) => item.species), ["アオリイカ", "ヤリイカ", "コウイカ"], "Japanese display names support partial matching");
assert.equal(presentation.filterSpeciesResults(sorted, "存在しない魚").length, 0, "a no-match search returns an empty result");
presentation.filterSpeciesResults(sorted, "アジ");
assert.deepEqual(original.map((item) => item.species), ["根魚", "シーバス", "アジ", "チヌ", "サバ", "イワシ", "青物", "シイラ", "ヒラメ", "マゴチ", "アオリイカ", "ヤリイカ", "コウイカ", "真鯛", "キス"], "sorting and searching do not mutate source data");
assert.equal(presentation.isValidAllSpeciesHistoryState({ view: "all-species", spotId: "spot-1", selectedTime: "2026-07-20T09:00" }, ["spot-1"], ["2026-07-20T09:00"]), true);
assert.equal(presentation.isValidAllSpeciesHistoryState({ view: "all-species", spotId: "invalid", selectedTime: "2026-07-20T09:00" }, ["spot-1"], ["2026-07-20T09:00"]), false, "an invalid spot id is rejected");
assert.equal(presentation.isValidAllSpeciesHistoryState({ view: "all-species", spotId: "spot-1", selectedTime: "invalid" }, ["spot-1"], ["2026-07-20T09:00"]), false, "an invalid forecast time is rejected");
assert.equal(presentation.getAllSpeciesStatusMessage({ status: "available", safetyStatus: "safe" }), null, "available scores do not show an unscored warning");
assert.equal(presentation.getAllSpeciesStatusMessage({ status: "safety_unknown", safetyStatus: "unknown", displayMessage: "internal", sourceName: "hidden", note: "hidden" }), "安全情報を確認できないため、総合評価は未算出です。地点相性のみ参考点として表示します。", "missing safety data has a user-facing reason without metadata");
assert.equal(presentation.getAllSpeciesStatusMessage({ status: "unsafe", safetyStatus: "unsafe", displayMessage: "internal", sourceUrl: "https://hidden.test" }), "危険な可能性があるため、総合点を表示していません。地点相性のみ参考点として表示します。", "unsafe scores are hidden with a user-facing reason");

const timesBySpot = { "spot-1": ["2026-07-20T09:00", "2026-07-20T12:00"], "spot-2": [] };
const validReturn = presentation.resolveAllSpeciesReturnState({ view: "all-species", spotId: "spot-1", selectedTime: "2026-07-20T12:00" }, ["spot-1", "spot-2"], timesBySpot, "spot-2", null);
assert.deepEqual(validReturn, { dashboardMode: "spotEvaluation", spotEvaluationTab: "評価", showAllSpecies: false, spotId: "spot-1", selectedTime: "2026-07-20T12:00", query: "" }, "browser back restores the validated origin and resets search");
const invalidSpotReturn = presentation.resolveAllSpeciesReturnState({ view: "all-species", spotId: "invalid", selectedTime: null }, ["spot-1", "spot-2"], timesBySpot, "spot-1", "2026-07-20T12:00");
assert.equal(invalidSpotReturn.spotId, "spot-1", "an invalid history spot falls back to the current valid evaluation spot");
assert.equal(invalidSpotReturn.dashboardMode, "spotEvaluation", "direct reload never falls through to catch reports");
assert.equal(invalidSpotReturn.spotEvaluationTab, "評価");
const invalidTimeReturn = presentation.resolveAllSpeciesReturnState({ view: "all-species", spotId: "spot-1", selectedTime: "invalid" }, ["spot-1", "spot-2"], timesBySpot, "spot-1", "invalid");
assert.equal(invalidTimeReturn.selectedTime, "2026-07-20T09:00", "an out-of-scope time is corrected to a valid forecast row");
const noRowsReturn = presentation.resolveAllSpeciesReturnState(null, ["spot-2"], timesBySpot, "spot-2", "invalid");
assert.equal(noRowsReturn.selectedTime, null, "a fallback spot without forecast rows uses null");
assert.equal(noRowsReturn.query, "", "return state resets search before the full-screen view is mounted again");

const hashState = { view: "all-species", spotId: "spot-1", selectedTime: "2026-07-20T12:00" };
const resolveHash = ({ requestSpotId = "spot-1", environmentSpotId = "spot-1", forecastTimes = [], loading = false, error = null } = {}) =>
  presentation.resolveInitialAllSpeciesHash(hashState, ["spot-1", "spot-2"], "spot-1", requestSpotId, environmentSpotId, forecastTimes, loading, error);
assert.deepEqual(resolveHash({ loading: true }), { kind: "waiting" }, "a matching spot with no rows waits only while its environment request is active");
assert.deepEqual(resolveHash({ forecastTimes: timesBySpot["spot-1"] }), { kind: "restore", state: hashState }, "a successful request with the selected row restores the full-screen view");
const failedHash = resolveHash({ error: "Open-Meteo failed" });
assert.equal(failedHash.kind, "fallback");
assert.deepEqual(failedHash.state, { dashboardMode: "spotEvaluation", spotEvaluationTab: "評価", showAllSpecies: false, spotId: "spot-1", selectedTime: null, query: "" }, "a failed request without cached rows reaches the safe evaluation fallback");
assert.equal(failedHash.removeHash, true, "the fallback explicitly requires removal of #all-species");
const emptyHash = resolveHash();
assert.equal(emptyHash.kind, "fallback", "a completed request without forecast rows does not wait indefinitely");
assert.equal(emptyHash.state.selectedTime, null);
assert.deepEqual(
  presentation.resolveInitialAllSpeciesHash(hashState, ["spot-1", "spot-2"], "spot-2", "spot-2", "spot-2", [], false, null),
  { kind: "switch-spot", spotId: "spot-1" },
  "reload restoration switches to the validated history spot before requesting its environment",
);
const browserBack = presentation.resolveAllSpeciesReturnState(hashState, ["spot-1", "spot-2"], timesBySpot, "spot-2", null);
assert.equal(browserBack.spotId, "spot-1");
assert.equal(browserBack.selectedTime, "2026-07-20T12:00", "normal browser back retains the origin spot and time");
assert.ok(card.includes("onShowAllSpecies"), "the all-species button opens the full-screen view through dashboard state");
assert.ok(dashboard.includes('window.addEventListener("popstate"') && dashboard.includes("resolveAllSpeciesReturnState"), "the tested transition function handles browser history events");
assert.ok(dashboard.includes("isValidAllSpeciesHistoryState"), "runtime history reads use the tested validator");
assert.ok(allSpeciesScreen.includes('useState("")') && !dashboard.includes("setAllSpeciesQuery"), "search state is new and empty for every mounted full-screen view");
assert.ok(allSpeciesScreen.includes("検索条件に一致する魚種はありません"), "the zero-result state is visible");
assert.ok(!allSpeciesScreen.includes("sourceUrl") && !allSpeciesScreen.includes("internalNote") && !allSpeciesScreen.includes("sourceName") && !presentation.getAllSpeciesStatusMessage({ status: "available", safetyStatus: "safe", sourceName: "secret", note: "internal" })?.includes("secret"), "source metadata and internal notes cannot enter status or card rendering");
console.log("spot evaluation behavior checks passed");
