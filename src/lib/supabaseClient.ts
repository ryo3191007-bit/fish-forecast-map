import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabasePublicEnvVar =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

let cachedClient: SupabaseClient | null = null;

export type SupabaseClientStatus =
  | { client: SupabaseClient; isConfigured: true; missingEnvVars: [] }
  | {
      client: null;
      isConfigured: false;
      missingEnvVars: SupabasePublicEnvVar[];
    };

export function getSupabaseClient(): SupabaseClientStatus {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missingEnvVars: SupabasePublicEnvVar[] = [];

  if (!supabaseUrl) {
    missingEnvVars.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    missingEnvVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      client: null,
      isConfigured: false,
      missingEnvVars,
    };
  }

  if (!cachedClient) {
    // Only NEXT_PUBLIC_* values are safe to use in the browser bundle.
    // Never pass SUPABASE_SERVICE_ROLE_KEY or SUPABASE_DB_URL to client code.
    cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return {
    client: cachedClient,
    isConfigured: true,
    missingEnvVars: [],
  };
}
