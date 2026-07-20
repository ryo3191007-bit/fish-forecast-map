import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const baselinePath = "supabase/migrations/20260720150000_add_fish_species_aliases.sql";
const expansionPath = "supabase/migrations/20260720190000_expand_fish_species_master.sql";
const baseline = readFileSync(baselinePath, "utf8");
const expansion = readFileSync(expansionPath, "utf8");

const baselineSeeds = [...baseline.matchAll(/\('([0-9a-f-]{36})',\s*'([^']+)',\s*'([^']+)'\)/g)]
  .map((match) => ({ id: match[1], speciesId: match[2], alias: match[3] }));
const expansionSpecies = [...expansion.matchAll(/\('([^']+)','([^']+)','[^']+','\{\}',(\d+),true,/g)]
  .map((match) => ({
    id: `00000000-0000-4000-8000-${String(Number(match[3]) + 84).padStart(12, "0")}`,
    speciesId: match[1],
    alias: match[2],
  }));
const seeds = [...baselineSeeds, ...expansionSpecies];

assert.equal(baselineSeeds.length, 17, "all baseline alias seeds must be inspected");
assert.equal(expansionSpecies.length, 28, "all expansion alias seeds must be inspected");
assert.equal(new Set(seeds.map((seed) => seed.id)).size, seeds.length, "alias seed UUIDs must be unique across migrations");
assert.equal(new Set(seeds.map((seed) => seed.alias.normalize("NFKC").trim().toLowerCase())).size, seeds.length, "approved active match_key values must be unique across migrations");

const aliasesById = new Map(seeds.map((seed) => [seed.id, seed]));
assert.deepEqual(aliasesById.get("00000000-0000-4000-8000-000000000016"), { id: "00000000-0000-4000-8000-000000000016", speciesId: "chinu", alias: "黒鯛" });
assert.deepEqual(aliasesById.get("00000000-0000-4000-8000-000000000017"), { id: "00000000-0000-4000-8000-000000000017", speciesId: "chinu", alias: "クロダイ" });
assert.match(expansion, /display_order \+ 84/, "new aliases must use the non-overlapping 100-127 UUID range");
assert.ok(!expansionSpecies.some((seed) => seed.id.endsWith("000000000016") || seed.id.endsWith("000000000017")), "the expansion must not overwrite existing Chinu aliases");

for (const alias of ["チヌ", "黒鯛", "クロダイ"]) {
  assert.equal(seeds.find((seed) => seed.alias === alias)?.speciesId, "chinu", `${alias} must continue to resolve to chinu`);
}

console.log(`fish species alias seed tests passed (${seeds.length} seeds)`);
