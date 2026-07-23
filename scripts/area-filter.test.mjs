import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/components/FishingDashboard.tsx", "utf8");
const styles = readFileSync("src/app/globals.css", "utf8");

assert.doesNotMatch(dashboard, /エリアフィルタ/, "the legacy area filter is removed");
assert.match(dashboard, /<span>地点フィルタ<\/span>/, "the spot filter is shown");
assert.match(dashboard, /placeholder="魚種名で検索"/, "species candidates are searchable");
assert.match(dashboard, /placeholder="地点名で検索"/, "spot candidates are searchable");
assert.match(dashboard, /speciesCandidateQuery[\s\S]*?\.filter\(\(\{ species \}\)/, "species candidate search filters species chips only");
assert.match(dashboard, /fishingSpots[\s\S]*?\.filter\(\(spot\) => `\$\{spot\.name\} \$\{spot\.id\}`/, "spot candidates come from and are searched from the master");
assert.match(dashboard, /selectedSpotId === "all" \|\| memo\.spotId === selectedSpotId/, "catch records are filtered by spotId");
assert.doesNotMatch(dashboard, /memo\.areaName === selected/, "catch records are not filtered by area name");
assert.match(dashboard, /selectedSpotId === "all" \|\|/, "unresolved records remain when no spot is selected");
assert.match(dashboard, /aria-label="キーワード検索をクリア"[\s\S]*?>\s*×\s*<\/button>/, "keyword clear button is an accessible multiplication sign");
assert.match(dashboard, /<span>釣果期間フィルタ<\/span>/, "catch period heading is updated");
assert.match(dashboard, /setSpeciesCandidateQuery\(""\)[\s\S]*?setSpotCandidateQuery\(""\)/, "reset clears both candidate searches");
assert.match(dashboard, /speciesCandidateQuery === ""[\s\S]*?spotCandidateQuery === ""/, "candidate searches participate in initial-state detection");
assert.match(styles, /@media \(max-width: 520px\)[\s\S]*?\.searchInputRow\s*\{\s*display: flex;/, "keyword input stays in one row on narrow screens");
assert.match(styles, /\.dateRangeRow\s*\{\s*grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)/, "date inputs stay in a bounded row");

console.log("Spot filter and compact filter UI regression checks passed");
