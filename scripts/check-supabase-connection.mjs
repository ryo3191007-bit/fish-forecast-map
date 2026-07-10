import { createClient } from "@supabase/supabase-js";

const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
  console.error("Supabase connection check failed: missing environment variables.");
  console.error(`Missing: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const { data, error } = await supabase
  .from("app_connection_checks")
  .select("id,message")
  .eq("id", "readonly-smoke-test")
  .maybeSingle();

if (error) {
  console.error("Supabase connection check failed.");
  console.error(`Error summary: ${error.message}`);
  process.exit(1);
}

if (!data) {
  console.error("Supabase connection check failed: readonly-smoke-test row was not found.");
  process.exit(1);
}

console.log("Supabase readonly connection check succeeded.");
console.log(`Fetched row: ${data.id}`);
