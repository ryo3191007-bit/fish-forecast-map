import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const masterPath = path.join(root, "src/domain/fishing.ts");
const researchDir = path.join(root, "data/research/fish-species");
const reportPath = path.join(root, "docs/research/FISH_SPECIES_ECOLOGY_INVENTORY.md");
const ecologyKeys = [
  "seasonality",
  "waterTemperature",
  "depthRange",
  "substrateHabitat",
  "salinityAndWaterBody",
  "dayNightTiming",
  "fishingMethods",
  "spawningOrConfusableInfo",
];
const statuses = ["confirmed", "inferred", "unknown", "not_applicable"];
const researchStates = ["not_researched", "complete", "blocked", "not_applicable"];
const unknownReasons = ["not_researched", "source_not_found", "insufficient_evidence", "conflicting_evidence", "scope_mismatch", "taxonomy_uncertain"];

function parseNullableToken(token) {
  return token === "null" ? null : token.slice(1, -1);
}

function parseMaster() {
  const source = fs.readFileSync(masterPath, "utf8");
  const rows = [];
  const tuple = /\["([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*(null|"[^"]+"),\s*(null|"[^"]+")(?:,\s*(true|false))?(?:,\s*(true|false))?\]/g;
  for (const match of source.matchAll(tuple)) {
    rows.push({
      id: match[1],
      nameJa: match[2],
      entityType: match[3],
      parentGroupId: parseNullableToken(match[4]),
      isSelectable: match[6] == null ? match[3] !== "species_group" : match[6] === "true",
      isActive: match[7] == null ? true : match[7] === "true",
    });
  }
  if (rows.length === 0) throw new Error("fish species master could not be parsed");
  return rows;
}

function readResearchDocs() {
  const docs = [];
  for (const fileName of fs.readdirSync(researchDir).filter((name) => name.endsWith(".json")).sort()) {
    const filePath = path.join(researchDir, fileName);
    const doc = JSON.parse(fs.readFileSync(filePath, "utf8"));
    docs.push({ fileName, doc });
  }
  const ids = docs.map(({ doc }) => doc.speciesId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) throw new Error(`duplicate research speciesId: ${[...new Set(duplicates)].join(", ")}`);
  return docs;
}

function summarizeSection(doc, section) {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
  const claims = doc?.ecology?.[section];
  if (!claims) return null;
  for (const key of ecologyKeys) {
    const status = claims[key]?.status;
    if (!statuses.includes(status)) throw new Error(`${doc.speciesId}:${section}/${key}: unexpected status ${String(status)}`);
    counts[status] += 1;
  }
  return counts;
}

function compactCounts(counts) {
  if (!counts) return "-";
  return `C${counts.confirmed}/I${counts.inferred}/U${counts.unknown}/N${counts.not_applicable}`;
}

function summarizeV14(doc) {
  if (doc?.schemaVersion !== "1.4.0") return null;
  const stateCounts = Object.fromEntries(researchStates.map((state) => [state, 0]));
  const reasonCounts = Object.fromEntries(unknownReasons.map((reason) => [reason, 0]));
  const claims = [doc.identity.canonicalNameJa, doc.identity.scientificName];
  for (const section of ["stableGeneral", "regionalCatchability"]) {
    for (const key of ecologyKeys) claims.push(doc.ecology[section][key]);
  }
  for (const claim of claims) {
    if (!researchStates.includes(claim.researchState)) throw new Error(`${doc.speciesId}: unexpected researchState ${String(claim.researchState)}`);
    stateCounts[claim.researchState] += 1;
    if (claim.unknownReason !== null) {
      if (!unknownReasons.includes(claim.unknownReason)) throw new Error(`${doc.speciesId}: unexpected unknownReason ${String(claim.unknownReason)}`);
      reasonCounts[claim.unknownReason] += 1;
    }
  }
  return { stateCounts, reasonCounts };
}

function compactResearchStates(summary) {
  if (!summary) return "-";
  const counts = summary.stateCounts;
  return `NR${counts.not_researched}/C${counts.complete}/B${counts.blocked}/NA${counts.not_applicable}`;
}

function escapeCell(value) {
  return String(value ?? "-").replaceAll("|", "\\|");
}

function ratio(numerator, denominator) {
  if (denominator === 0) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function generateInventory() {
  const master = parseMaster();
  const active = master.filter((row) => row.isActive);
  const activeById = new Map(active.map((row) => [row.id, row]));
  const researchDocs = readResearchDocs();
  const researchById = new Map(researchDocs.map(({ fileName, doc }) => [doc.speciesId, { fileName, doc }]));

  const rows = active.map((row) => {
    const research = researchById.get(row.id) ?? null;
    const stable = research ? summarizeSection(research.doc, "stableGeneral") : null;
    const regional = research ? summarizeSection(research.doc, "regionalCatchability") : null;
    const childCount = active.filter((candidate) => candidate.parentGroupId === row.id).length;
    return {
      ...row,
      childCount,
      hasResearch: research !== null,
      schemaVersion: research?.doc.schemaVersion ?? null,
      stable,
      regional,
      v14: research ? summarizeV14(research.doc) : null,
    };
  });

  const entityCounts = new Map();
  for (const row of active) entityCounts.set(row.entityType, (entityCounts.get(row.entityType) ?? 0) + 1);

  const researchedRows = rows.filter((row) => row.hasResearch);
  const missingRows = rows.filter((row) => !row.hasResearch);
  const groupResearchedRows = researchedRows.filter((row) => row.entityType === "species_group");
  const nonGroupResearchedRows = researchedRows.filter((row) => row.entityType !== "species_group");
  const stableUnknown = researchedRows.reduce((sum, row) => sum + row.stable.unknown, 0);
  const stableMeasuredTotal = researchedRows.length * ecologyKeys.length;
  const groupStableUnknown = groupResearchedRows.reduce((sum, row) => sum + row.stable.unknown, 0);
  const groupStableTotal = groupResearchedRows.length * ecologyKeys.length;
  const nonGroupStableUnknown = nonGroupResearchedRows.reduce((sum, row) => sum + row.stable.unknown, 0);
  const nonGroupStableTotal = nonGroupResearchedRows.length * ecologyKeys.length;
  const regionalUnknown = researchedRows.reduce((sum, row) => sum + row.regional.unknown, 0);
  const regionalMeasuredTotal = researchedRows.length * ecologyKeys.length;
  const effectiveUnresolved = stableUnknown + missingRows.length * ecologyKeys.length;
  const activeAttributeTotal = rows.length * ecologyKeys.length;
  const allStableUnknown = rows.filter((row) => row.stable?.unknown === ecologyKeys.length);
  const emptyGroups = rows.filter((row) => row.entityType === "species_group" && row.childCount === 0);
  const schemaCounts = new Map();
  for (const row of researchedRows) schemaCounts.set(row.schemaVersion, (schemaCounts.get(row.schemaVersion) ?? 0) + 1);
  const orphanResearch = researchDocs.filter(({ doc }) => !activeById.has(doc.speciesId));
  const v14Rows = researchedRows.filter((row) => row.v14);
  const v14StateTotals = Object.fromEntries(researchStates.map((state) => [state, v14Rows.reduce((sum, row) => sum + row.v14.stateCounts[state], 0)]));
  const v14ReasonTotals = Object.fromEntries(unknownReasons.map((reason) => [reason, v14Rows.reduce((sum, row) => sum + row.v14.reasonCounts[reason], 0)]));
  const v2TargetRows = rows.filter((row) => row.entityType !== "species_group");
  const v2UnresearchedRows = v2TargetRows.filter((row) => row.schemaVersion !== "1.4.0" || row.v14.stateCounts.not_researched > 0);

  const lines = [
    "# 魚種master × 生態調査状況 棚卸し",
    "",
    "Issue #329 の棚卸し正本。`src/domain/fishing.ts` のactive masterと `data/research/fish-species/*.json` を機械的に突合した結果を記録する。",
    "",
    "## 集計",
    "",
    `- active master: **${rows.length}件**`,
    `- entityType: ${[...entityCounts.entries()].sort().map(([type, count]) => `\`${type}\` ${count}件`).join(" / ")}`,
    `- 生態JSONあり: **${researchedRows.length}件** / なし: **${missingRows.length}件**`,
    `- schemaVersion: ${[...schemaCounts.entries()].sort().map(([version, count]) => `\`${version}\` ${count}件`).join(" / ") || "なし"}`,
    `- v1.4移行: **${v14Rows.length}/${v2TargetRows.length} taxon** / 未移行または未調査claimあり: **${v2UnresearchedRows.length} taxon**`,
    `- v1.4 researchState（identity 2 + ecology 16 claim）: ${researchStates.map((state) => `\`${state}\` ${v14StateTotals[state]}`).join(" / ")}`,
    `- v1.4 unknownReason: ${unknownReasons.map((reason) => `\`${reason}\` ${v14ReasonTotals[reason]}`).join(" / ")}`,
    `- 既存JSON内の \`stableGeneral\` unknown: **${stableUnknown}/${stableMeasuredTotal}属性 (${ratio(stableUnknown, stableMeasuredTotal)})**`,
    `  - species_group: **${groupStableUnknown}/${groupStableTotal}属性 (${ratio(groupStableUnknown, groupStableTotal)})**`,
    `  - 個別taxon（species_group以外）: **${nonGroupStableUnknown}/${nonGroupStableTotal}属性 (${ratio(nonGroupStableUnknown, nonGroupStableTotal)})**`,
    `- 既存JSON内の \`regionalCatchability\` unknown: **${regionalUnknown}/${regionalMeasuredTotal}属性 (${ratio(regionalUnknown, regionalMeasuredTotal)})**`,
    `- JSON未作成を8属性未評価として含めた \`stableGeneral\` 未解決相当: **${effectiveUnresolved}/${activeAttributeTotal}属性 (${ratio(effectiveUnresolved, activeAttributeTotal)})**`,
    `- \`stableGeneral\` 8/8 unknown: **${allStableUnknown.length}件**`,
    `- 子species 0件のspecies_group: **${emptyGroups.length}件**`,
    `- active master外の研究JSON: **${orphanResearch.length}件**`,
    "",
    "### JSON未作成",
    "",
    missingRows.length > 0 ? missingRows.map((row) => `- ${row.nameJa} (\`${row.id}\`)`).join("\n") : "なし",
    "",
    "### stableGeneral が8/8 unknown",
    "",
    allStableUnknown.length > 0 ? allStableUnknown.map((row) => `- ${row.nameJa} (\`${row.id}\`) — ${row.entityType}`).join("\n") : "なし",
    "",
    "### v2未調査taxon",
    "",
    v2UnresearchedRows.length > 0 ? v2UnresearchedRows.map((row) => `- ${row.nameJa} (\`${row.id}\`) — ${row.schemaVersion === "1.4.0" ? "not_researched claimあり" : `schema ${row.schemaVersion ?? "なし"}`}`).join("\n") : "なし",
    "",
    "### 子speciesが0件のspecies_group",
    "",
    emptyGroups.length > 0 ? emptyGroups.map((row) => `- ${row.nameJa} (\`${row.id}\`)`).join("\n") : "なし",
    "",
    "## 全active master一覧",
    "",
    "`stable` / `regional` は `C=confirmed / I=inferred / U=unknown / N=not_applicable` の8属性内訳。JSONがない場合は `-`。",
    "",
    "| # | speciesId | 表示名 | entityType | parent | 子 | JSON | schema | stable | regional | v1.4 state |",
    "|---:|---|---|---|---|---:|:---:|---|---|---|---|",
    ...rows.map((row, index) => `| ${index + 1} | \`${escapeCell(row.id)}\` | ${escapeCell(row.nameJa)} | ${escapeCell(row.entityType)} | ${row.parentGroupId ? `\`${escapeCell(row.parentGroupId)}\`` : "-"} | ${row.childCount} | ${row.hasResearch ? "あり" : "なし"} | ${escapeCell(row.schemaVersion)} | ${compactCounts(row.stable)} | ${compactCounts(row.regional)} | ${compactResearchStates(row.v14)} |`),
    "",
    "## 読み方と次工程への注意",
    "",
    "- `unknown` は未確認を意味し、不適・0点・非生息を意味しない。",
    "- JSON未作成と、JSON内で明示的に `unknown` とした属性は区別する。",
    "- species_groupは子speciesの生態を自動継承しない。子が0件のgroupは、個別taxon追加候補を別Issueで調査する。",
    "- `regionalCatchability` は一般生態から推測せず、対象地域の陸っぱりに直接結び付く根拠がある場合だけ埋める。",
    "- 本棚卸しはSCORE v2、UI、DB、魚種master、生態値を変更しない。",
    "",
  ];
  return lines.join("\n");
}

const markdown = generateInventory();
const mode = process.argv[2] ?? "--print";

if (mode === "--write") {
  fs.writeFileSync(reportPath, markdown, "utf8");
  console.log(`wrote ${path.relative(root, reportPath)}`);
} else if (mode === "--check") {
  if (!fs.existsSync(reportPath)) throw new Error(`missing ${path.relative(root, reportPath)}; run with --write`);
  const existing = fs.readFileSync(reportPath, "utf8");
  if (existing !== markdown) throw new Error(`${path.relative(root, reportPath)} is stale; regenerate with --write`);
  console.log("fish species ecology inventory is up to date");
} else if (mode === "--print") {
  console.log(markdown);
} else {
  throw new Error(`unknown mode: ${mode}`);
}
