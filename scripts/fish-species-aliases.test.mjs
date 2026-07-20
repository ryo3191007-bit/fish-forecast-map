import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const baselinePath = "supabase/migrations/20260720150000_add_fish_species_aliases.sql";
const expansionPath = "supabase/migrations/20260720190000_expand_fish_species_master.sql";
const baseline = readFileSync(baselinePath, "utf8");
const expansion = readFileSync(expansionPath, "utf8");

const baselineSeeds = [...baseline.matchAll(/\('([0-9a-f-]{36})',\s*'([^']+)',\s*'([^']+)'\)/g)]
  .map((match) => ({ id: match[1], speciesId: match[2], alias: match[3] }));
const insertedSpecies = new Map(
  [...expansion.matchAll(/\('([^']+)','([^']+)','[^']+','\{\}',\d+,true,/g)]
    .map((match) => [match[1], match[2]]),
);
const expansionSpecies = [...expansion.matchAll(/\('([0-9a-f-]{36})'::uuid,'([^']+)'\)/g)]
  .map((match) => ({ id: match[1], speciesId: match[2], alias: insertedSpecies.get(match[2]) }));
const seeds = [...baselineSeeds, ...expansionSpecies];

assert.equal(baselineSeeds.length, 17, "all baseline alias seeds must be inspected");
assert.equal(expansionSpecies.length, 28, "all expansion alias seeds must be inspected");
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

console.log(`fish species alias seed tests passed (${seeds.length} seeds)`);
