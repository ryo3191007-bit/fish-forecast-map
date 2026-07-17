import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const dashboard = fs.readFileSync(
  "src/components/FishingDashboard.tsx",
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
  ["糸島西岸", "唐津湾", "唐津湾北部", "伊万里湾", "平戸"],
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
  "areas without catch memos must remain visible with count zero",
);
assert.match(
  dashboard,
  /\}, \[fishingSpots, manualCatchMemos\]\);/,
  "area filter counts must refresh for both master data and catch memos",
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

console.log("Area filter regression checks passed");
