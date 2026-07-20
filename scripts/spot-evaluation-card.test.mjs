import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const card = readFileSync(new URL("../src/components/SpotEvaluationCard.tsx", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../src/components/FishingDashboard.tsx", import.meta.url), "utf8");

for (const requirement of [
  'role="combobox"', 'role="listbox"', 'event.key === "ArrowDown"', 'event.key === "ArrowUp"',
  'event.key === "Enter"', 'event.key === "Escape"', 'document.addEventListener("pointerdown"',
  '`${spot.name} ${spot.areaName}`', "候補がありません", "前の1時間", "現在時刻へ戻る", "次の1時間",
  'role="tablist"', 'role="tabpanel"', 'const tabs: SpotEvaluationTab[] = ["評価", "環境", "釣場", "地形"]',
  ".slice(0, 5)", 'item.informationStatus !== "no_information"', "総合点未算出", "地点相性: 高",
  "環境評価: 高", "一部情報未反映", "APIエラー", "予報対象外", "対象行欠落",
  '["fishing_range", "釣り可能範囲"]', '["water_flow_influences", "潮通し・河川影響・外海影響"]',
]) assert.ok(card.includes(requirement), `missing requirement: ${requirement}`);

assert.ok(!card.includes("sourceName"), "source metadata must not be rendered");
assert.ok(!card.includes(".note"), "internal notes must not be rendered");
assert.ok(dashboard.includes("activeTab={spotEvaluationTab}"), "tab state must survive mode switches");
assert.ok(dashboard.includes("selectedTime={selectedEnvironmentTime}"), "datetime state must survive mode switches");
assert.ok(dashboard.includes("fetchFishingSpotDetails(environmentSpot.id)"), "spot changes must reload details");
assert.ok(dashboard.includes("latitude: environmentSpot.latitude"), "spot changes must update forecast coordinates");
console.log("spot evaluation card requirements: ok");
