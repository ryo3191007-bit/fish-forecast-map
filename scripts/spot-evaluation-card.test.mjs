import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const dashboard = readFileSync(new URL("../src/components/FishingDashboard.tsx", import.meta.url), "utf8");
const allSpeciesScreen = readFileSync(new URL("../src/components/AllSpeciesEvaluation.tsx", import.meta.url), "utf8");
const presentation = load("src/domain/spotEvaluationPresentation.ts");

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
assert.equal(presentation.formatSpotDetailValue(value("new", "river_influence:none")), "河川の影響なし");
assert.equal(presentation.formatSpotDetailValue(value("new", "unknown_internal_code")), "その他の確認済み情報");

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
assert.ok(card.includes("onShowAllSpecies"), "the all-species button opens the full-screen view through dashboard state");
assert.ok(dashboard.includes('window.addEventListener("popstate"') && dashboard.includes('setSpotEvaluationTab("評価")'), "browser back restores the evaluation tab");
assert.ok(dashboard.includes("origin.spotId") && dashboard.includes("origin.selectedTime"), "both in-screen and browser back restore the originating spot and time");
assert.ok(dashboard.includes('window.location.hash === "#all-species"') && dashboard.includes("replaceState(null"), "reload without restorable state safely falls back to spot evaluation");
assert.ok(allSpeciesScreen.includes('useState("")') && !dashboard.includes("setAllSpeciesQuery"), "search state is new and empty for every mounted full-screen view");
assert.ok(allSpeciesScreen.includes("検索条件に一致する魚種はありません"), "the zero-result state is visible");
assert.ok(!allSpeciesScreen.includes("sourceUrl") && !allSpeciesScreen.includes("internalNote") && !allSpeciesScreen.includes("sourceName"), "source metadata and internal notes cannot enter full-screen rendering");
console.log("spot evaluation behavior checks passed");
