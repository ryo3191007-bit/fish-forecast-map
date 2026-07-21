import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const baselinePath = "supabase/migrations/20260720150000_add_fish_species_aliases.sql";
const expansionPath = "supabase/migrations/20260720190000_expand_fish_species_master.sql";
const batch1Path = "supabase/migrations/20260720210000_seed_fish_species_aliases_batch_1.sql";
const batch2Path = "supabase/migrations/20260720220000_seed_fish_species_aliases_batch_2.sql";
const regionalPath = "supabase/migrations/20260721090000_simplify_regional_fish_species_aliases.sql";
const baseline = readFileSync(baselinePath, "utf8");
const expansion = readFileSync(expansionPath, "utf8");
const batch1 = readFileSync(batch1Path, "utf8");
const batch2 = readFileSync(batch2Path, "utf8");
const regional = readFileSync(regionalPath, "utf8");

const baselineSeeds = [...baseline.matchAll(/\('([0-9a-f-]{36})',\s*'([^']+)',\s*'([^']+)'\)/g)]
  .map((match) => ({ id: match[1], speciesId: match[2], alias: match[3] }));
const insertedSpecies = new Map(
  [...expansion.matchAll(/\('([^']+)','([^']+)','[^']+','\{\}',\d+,true,/g)]
    .map((match) => [match[1], match[2]]),
);
const expansionSpecies = [...expansion.matchAll(/\('([0-9a-f-]{36})'::uuid,'([^']+)'\)/g)]
  .map((match) => ({ id: match[1], speciesId: match[2], alias: insertedSpecies.get(match[2]) }));
const batch1Seeds = [...batch1.matchAll(/\('([0-9a-f-]{36})',\s*'([^']+)',\s*'([^']+)'\)/g)]
  .map((match) => ({ id: match[1], speciesId: match[2], alias: match[3] }));
const batch2Seeds = [...batch2.matchAll(/\('([0-9a-f-]{36})',\s*'([^']+)',\s*'([^']+)'\)/g)]
  .map((match) => ({ id: match[1], speciesId: match[2], alias: match[3] }));
const regionalSeeds = [...regional.matchAll(/\('([0-9a-f-]{36})',\s*'([^']+)',\s*'([^']+)'\)/g)]
  .map((match) => ({ id: match[1], speciesId: match[2], alias: match[3] }));
const seeds = [...baselineSeeds, ...expansionSpecies, ...batch1Seeds, ...batch2Seeds, ...regionalSeeds];

assert.equal(baselineSeeds.length, 17, "all baseline alias seeds must be inspected");
assert.equal(expansionSpecies.length, 28, "all expansion alias seeds must be inspected");
assert.equal(batch1Seeds.length, 5, "Issue #211 batch 1 must contain exactly five approved aliases");
assert.equal(batch2Seeds.length, 10, "Issue #220 batch 2 must contain exactly ten approved aliases");
assert.equal(regionalSeeds.length, 24, "regional simplification must add all aliases approved by the latest specification");
assert.match(expansion, /drop constraint if exists fish_species_category_check;[\s\S]*?check \(category in \('fish', 'squid', 'category', 'cephalopod'\)\)[\s\S]*?validate constraint fish_species_category_check;[\s\S]*?insert into public\.fish_species/, "the category constraint must allow cephalopod before species are seeded");
assert.equal(new Set(seeds.map((seed) => seed.id)).size, seeds.length, "alias seed UUIDs must be unique across migrations");
assert.equal(new Set(seeds.map((seed) => seed.alias.normalize("NFKC").trim().toLowerCase())).size, seeds.length, "approved active match_key values must be unique across migrations");

const aliasesById = new Map(seeds.map((seed) => [seed.id, seed]));
assert.deepEqual(aliasesById.get("00000000-0000-4000-8000-000000000016"), { id: "00000000-0000-4000-8000-000000000016", speciesId: "chinu", alias: "黒鯛" });
assert.deepEqual(aliasesById.get("00000000-0000-4000-8000-000000000017"), { id: "00000000-0000-4000-8000-000000000017", speciesId: "chinu", alias: "クロダイ" });
assert.doesNotMatch(expansion, /where display_order between/, "alias targets must not be inferred from non-unique display_order values");
assert.match(expansion, /with alias_seeds\(alias_id, fish_species_id\) as \(values/, "alias targets must use an explicit ID allowlist");
assert.deepEqual(new Set(expansionSpecies.map((seed) => seed.speciesId)), new Set(insertedSpecies.keys()), "only the 28 species inserted by this migration receive aliases");
assert.ok(expansionSpecies.every((seed) => seed.id.match(/0000000001(?:0\d|1\d|2[0-7])$/)), "new aliases must use the deterministic 100-127 UUID range");
assert.ok(!expansionSpecies.some((seed) => seed.id.endsWith("000000000016") || seed.id.endsWith("000000000017")), "the expansion must not overwrite existing Chinu aliases");

for (const alias of ["チヌ", "黒鯛", "クロダイ"]) {
  assert.equal(seeds.find((seed) => seed.alias === alias)?.speciesId, "chinu", `${alias} must continue to resolve to chinu`);
}

assert.deepEqual(batch1Seeds.map(({ speciesId, alias }) => [speciesId, alias]), [
  ["aoriika", "ミズイカ"], ["aoriika", "モイカ"], ["kisu", "シロギス"], ["kisu", "キスゴ"], ["seabass", "スズキ"],
]);
assert.ok(batch1Seeds.every((seed) => /^00000000-0000-4000-8000-00000000020[0-4]$/.test(seed.id)), "batch 1 uses its deterministic UUID range");
assert.doesNotMatch(batch1, /'(?:セイゴ|フッコ|ハネ|ササイカ|ハマチ|ヤズコ|ヤズ|ワラサ|マアジ|マサバ)'/, "deferred names must not be seeded in batch 1");

assert.deepEqual(batch2Seeds.map(({ speciesId, alias }) => [speciesId, alias]), [
  ["kasago", "アラカブ"], ["kasago", "ガシラ"], ["isaki", "イッサキ"], ["kijihata", "アコウ"], ["oniokoze", "オグシ"],
  ["madai", "マチャ"], ["madai", "チャンイオ"], ["buri", "ヤズ"], ["buri", "ハマチ"], ["sawara", "サゴシ"],
]);
assert.ok(batch2Seeds.every((seed) => /^00000000-0000-4000-8000-00000000030\d$/.test(seed.id)), "batch 2 uses its deterministic UUID range");
assert.match(batch2, /public\.fish_species_match_key\(seed\.alias_name\)/, "batch 2 match keys use the canonical database function");
assert.match(batch2, /'approved',[\s\S]*?'migration:issue-220-batch-2'/, "batch 2 records approval status and audit attribution");
assert.doesNotMatch(batch2, /'(?:セイゴ|フッコ|ハネ|コハダ|ササイカ|ヤリイカ|マアジ|マサバ|マイワシ)'/, "deferred and excluded names must not be seeded in batch 2");

assert.match(regional, /where id = 'yariika';/, "legacy yariika is updated in place, not deleted");
assert.match(regional, /set is_active = false, is_selectable = false/, "legacy yariika is inactive and unselectable");
assert.match(regional, /set fish_species_id = 'kensakiika'[\s\S]*?fish_species_match_key\('ヤリイカ'\)/, "the existing ヤリイカ alias is reassigned to kensakiika");
for (const [alias, speciesId] of [
  ["セイゴ", "seabass"], ["フッコ", "seabass"], ["アカイカ", "kensakiika"], ["ササイカ", "kensakiika"],
  ["ヒラス", "hiramasa"], ["ネリゴ", "kanpachi"], ["クロ", "mejina"], ["メイタ", "chinu"],
  ["コハダ", "konoshiro"], ["ツナシ", "konoshiro"], ["イナ", "bora"], ["アラ", "kue"],
  ["オオクチ", "hirame"], ["豆アジ", "maaji"], ["ゼンゴ", "maaji"], ["ワカナ", "buri"],
  ["ホンダイ", "madai"], ["ジャミ", "madai"], ["タテコ", "madai"],
  ["ハゲ", "kawahagi"], ["ハギ", "kawahagi"], ["カマス", "kamasu"],
  ["モンゴウイカ", "kouika"], ["カミナリイカ", "kouika"],
]) assert.equal(regionalSeeds.find((seed) => seed.alias === alias)?.speciesId, speciesId, `${alias} has the approved regional target`);
assert.match(regional, /where id in \('akakamasu', 'yamatokamasu'\)/, "legacy kamasu IDs are updated in place");
assert.match(regional, /set fish_species_id = 'kamasu'[\s\S]*?fish_species_match_key\('アカカマス'\)[\s\S]*?fish_species_match_key\('ヤマトカマス'\)/, "existing individual kamasu aliases are reassigned to the group");
assert.doesNotMatch(regional, /'シリヤケイカ'/, "unspecified cuttlefish names are not added");

console.log(`fish species alias seed tests passed (${seeds.length} seeds)`);
