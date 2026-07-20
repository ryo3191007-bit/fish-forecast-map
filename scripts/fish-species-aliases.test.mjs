import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260720150000_add_fish_species_aliases.sql", "utf8");
const resolver = fs.readFileSync("src/lib/fishSpeciesResolver.ts", "utf8");
const repository = fs.readFileSync("src/lib/masterDataRepository.ts", "utf8");
const normalize = (input) => input.normalize("NFKC").trim().toLowerCase();
const rows = [...migration.matchAll(/\('([0-9a-f-]{36})', '([^']+)', '([^']+)'\)/g)].map((match) => ({ speciesId: match[2], alias: match[3], matchKey: normalize(match[3]) }));

assert.equal(rows.length, 17, "all canonical names and only two approved Chinu aliases are seeded");
const activeKeys = new Map();
for (const row of rows) {
  assert.ok(!activeKeys.has(row.matchKey), `duplicate approved active match_key: ${row.matchKey}`);
  activeKeys.set(row.matchKey, row.speciesId);
}
for (const name of ["チヌ", "黒鯛", "クロダイ"]) assert.equal(activeKeys.get(normalize(name)), "chinu", `${name} resolves to chinu`);
assert.equal(activeKeys.get(normalize("未登録魚")), undefined, "unknown names remain unresolved");
assert.equal(normalize("  ＡｊＩ  "), "aji", "NFKC, trim, and case folding are stable");
assert.match(migration, /unique index[\s\S]+where approval_status = 'approved' and is_active = true/i);
assert.match(migration, /match_key = public\.fish_species_match_key\(alias_name\)/);
assert.match(migration, /revoke all[\s\S]+from anon, authenticated/i);
assert.match(migration, /using \(approval_status = 'approved' and is_active = true\)/);
assert.match(migration, /on conflict \(id\) do update/i, "seed is repeatable");
assert.match(resolver, /approvalStatus === "approved"/);
assert.match(resolver, /alias\.isActive/);
assert.match(resolver, /status: "conflict"/);
assert.match(resolver, /status: "unresolved"/);
assert.match(repository, /staticFishSpeciesAliases/, "static fallback has identical aliases");
console.log("OK fish species alias migration, seed, resolver, and static fallback");
