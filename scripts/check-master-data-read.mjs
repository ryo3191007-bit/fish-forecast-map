import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

const staticCounts = {
  fishSpecies: 15,
  fishingSpots: 18,
  sourceRegistry: 4,
};

if (existsSync(".env.local")) {
  loadEnvFile(".env.local");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function printResult(source, counts, fallbackReason) {
  console.log(`Supabase configured: ${isConfigured ? "yes" : "no"}`);
  console.log(`Source: ${source}`);
  if (fallbackReason) console.log(`Fallback reason: ${fallbackReason}`);
  console.log(`fish_species count: ${counts.fishSpecies}`);
  console.log(`fishing_spots count: ${counts.fishingSpots}`);
  console.log(`source_registry count: ${counts.sourceRegistry}`);
}

async function countRows(client, tableName) {
  const { count, error } = await client.from(tableName).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${tableName}: ${error.message}`);
  return count ?? 0;
}

if (!isConfigured) {
  printResult("static-fallback", staticCounts, "missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(0);
}

try {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const [fishSpecies, fishingSpots, sourceRegistry] = await Promise.all([
    countRows(client, "fish_species"),
    countRows(client, "fishing_spots"),
    countRows(client, "source_registry"),
  ]);

  const counts = { fishSpecies, fishingSpots, sourceRegistry };
  if (fishSpecies === 0 || fishingSpots === 0 || sourceRegistry === 0) {
    printResult("static-fallback", staticCounts, "one or more Supabase master tables returned 0 rows");
  } else {
    printResult("supabase", counts);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "Supabase read failed";
  printResult("static-fallback", staticCounts, message);
}
