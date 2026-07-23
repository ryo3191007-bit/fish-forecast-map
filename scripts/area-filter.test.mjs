import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/components/FishingDashboard.tsx", "utf8");
const styles = readFileSync("src/app/globals.css", "utf8");

assert.doesNotMatch(dashboard, /エリアフィルタ/, "the legacy area filter is removed");
assert.match(dashboard, /<span>地点フィルタ<\/span>/, "the spot filter is shown");
assert.match(dashboard, /placeholder="魚種名で検索"/, "species candidates are searchable");
assert.match(dashboard, /placeholder="地点名で検索"/, "spot candidates are searchable");
assert.match(dashboard, /groupSelectableFishSpecies[\s\S]*?\.flatMap\(\(group\) => group\.items\.map\(\(item\) => item\.nameJa\)\)[\s\S]*?\.filter\(\(species\)/, "species groups are flattened before candidate search filters one chip list");
assert.doesNotMatch(dashboard, /speciesFilterGroup|speciesFilterGroupLabel|speciesFilterGroupChips/, "species chips have no nested group DOM");
assert.match(dashboard, /fishingSpots[\s\S]*?\.filter\(\(spot\) => `\$\{spot\.name\} \$\{spot\.id\}`/, "spot candidates come from and are searched from the master");
assert.match(dashboard, /selectedSpotId === "all" \|\| memo\.spotId === selectedSpotId/, "catch records are filtered by spotId");
assert.doesNotMatch(dashboard, /memo\.areaName === selected/, "catch records are not filtered by area name");
assert.match(dashboard, /selectedSpotId === "all" \|\|/, "unresolved records remain when no spot is selected");
assert.match(dashboard, /aria-label="キーワード検索をクリア"[\s\S]*?>\s*×\s*<\/button>/, "keyword clear button is an accessible multiplication sign");
assert.match(dashboard, /<span>釣果期間フィルタ<\/span>/, "catch period heading is updated");
assert.equal((dashboard.match(/<section className="filterCard/g) ?? []).length, 5, "each filter is rendered as one of five independent cards");
assert.equal((dashboard.match(/className="candidateSearchField"/g) ?? []).length, 2, "species and spot searches have explicit search icons");
assert.match(dashboard, /dateFilterCard[\s\S]*?開始日を選択[\s\S]*?calendarIcon[\s\S]*?終了日を選択[\s\S]*?calendarIcon/, "date filter has a titled second row with placeholders and calendar icons");
assert.match(dashboard, /label: "新着順（新しい順）"/, "newest-first sort wording matches the reference");
assert.match(dashboard, /className="resetFiltersButton"[\s\S]*?<svg aria-hidden="true"/, "reset button has a decorative reset icon");
assert.doesNotMatch(dashboard, /<strong>\{(?:manualCatchMemos\.length|count)\}<\/strong>/, "filter chips do not render count badges");
for (const removedCopy of ["タップして絞り込み", "魚種とAND条件", "場所・魚種・釣り方など", "開始日と終了日で絞り込み", "絞り込み後に適用", "現在の並び順"]) {
  assert.doesNotMatch(dashboard, new RegExp(removedCopy), `${removedCopy} is not displayed`);
}
assert.match(dashboard, /setSpeciesCandidateQuery\(""\)[\s\S]*?setSpotCandidateQuery\(""\)/, "reset clears both candidate searches");
assert.match(dashboard, /speciesCandidateQuery === ""[\s\S]*?spotCandidateQuery === ""/, "candidate searches participate in initial-state detection");
assert.match(styles, /\.keywordFilterRow\s*\{\s*grid-template-columns: auto minmax\(0, 1fr\) auto;/, "keyword label, input, and clear button stay in one row");
assert.match(styles, /\.dateFilterRow\s*\{\s*grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)/, "date inputs stay in one bounded second row");
assert.match(styles, /\.sortFilterRow\s*\{\s*grid-template-columns: auto minmax\(0, 1fr\) auto;/, "sort label, select, and reset button stay in one row");
assert.match(styles, /\.speciesChips\s*\{[\s\S]*?flex-wrap: nowrap;[\s\S]*?overflow-x: auto;/, "chip rows alone scroll horizontally");
assert.match(styles, /\.filterCard\s*\{[\s\S]*?border:[\s\S]*?border-radius:[\s\S]*?background:/, "independent cards share border, radius, and background styling");

console.log("Spot filter and compact filter UI regression checks passed");
