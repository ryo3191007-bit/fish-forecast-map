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
const presentation = load("src/domain/spotEvaluationPresentation.ts");

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
assert.ok(card.includes('selectedTime={props.selectedTime}'), "datetime remains available without a matching environment row");
assert.ok(card.includes('props.detailStatus === "ready" ? scopeSpotDetails'), "only ready, matching details enter scoring");
console.log("spot evaluation behavior checks passed");
