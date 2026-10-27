import "server-only";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Server-only Supabase client. Uses the service-role key, which bypasses RLS:
// every read/write in this app goes through server code that authorizes the
// caller first (see lib/auth/permissions.ts). The key must never be exposed to
// the browser — no NEXT_PUBLIC_ prefix, and this module is `server-only`.
export function getServiceClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
