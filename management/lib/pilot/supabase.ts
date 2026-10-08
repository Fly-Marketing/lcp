import "server-only";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Service-role client: bypasses RLS, server-only, never reaches the browser.
// All pilot reads/writes go through this — the trust boundary is "this code
// runs on the server", not Postgres-level policy (see access_links' deny-all
// RLS, which exists specifically to block the anon key from touching it).
export function getServiceClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}
