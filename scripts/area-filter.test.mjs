import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const dashboard = fs.readFileSync(
  "src/components/FishingDashboard.tsx",
  "utf8",
);
const layout = fs.readFileSync("src/app/layout.tsx", "utf8");
const filterCountStyles = fs.readFileSync(
  "src/app/filter-counts.css",
  "utf8",
);
const fishingSpotsSource = fs
  .readFileSync("src/data/fishingSpots.ts", "utf8")
  .replace(/^import[^;]+;\n/gm, "")
  .replace(/ as const/g, "");
const fishingSpotsMatch = fishingSpotsSource.match(
  /export const fishingSpots(?:[^=]*) = ([\s\S]*?);/,
);
assert.ok(fishingSpotsMatch, "fishingSpots export must be readable");
const fishingSpots = JSON.parse(
  vm.runInNewContext(
    `const fishingSpots = ${fishingSpotsMatch[1]}; JSON.stringify(fishingSpots)`,
    {},
  ),
);

const areaNames = Array.from(
  new Set(fishingSpots.map((spot) => spot.areaName)),
);
assert.deepEqual(
  areaNames,
  ["糸島西岸", "唐津湾", "唐津湾北部", "伊万里湾", "伊万里湾東岸", "伊万里湾・福島", "伊万里湾・鷹島", "唐津湾沿岸", "呼子・鎮西", "肥前・玄海沿岸", "平戸"],
  "area filter candidates must follow the fishing spot master order",
);

assert.match(
  dashboard,
  /new Set\(fishingSpots\.map\(\(spot\) => spot\.areaName\)\)/,
  "area filter candidates must be generated from the fishing spot master",
);
assert.match(
  dashboard,
  /return areaNames\.map\(\(areaName\) => \(\{[\s\S]*?count: counts\.get\(areaName\) \?\? 0/,
  "areas without catch memos must remain available internally",
);
assert.match(
  dashboard,
  /\}, \[fishingSpots, manualCatchMemos\]\);/,
  "area filter data must refresh for both master data and catch memos",
);
assert.doesNotMatch(
  dashboard,
  /return Array\.from\(counts, \(\[areaName, count\]\)/,
  "area candidates must not be limited to areas appearing in catch memos",
);
assert.match(
  dashboard,
  /areaCounts\.map\(\(\{ areaName, count \}\) =>/,
  "all generated area candidates must render as filter buttons",
);

assert.match(
  layout,
  /import "\.\/filter-counts\.css";/,
  "filter count visibility rules must be loaded globally",
);
assert.match(
  filterCountStyles,
  /\.reportFilters \.speciesChip strong\s*\{[\s\S]*?display:\s*none;/,
  "fish and area filter count badges must stay hidden",
);

console.log("Area filter regression checks passed");
