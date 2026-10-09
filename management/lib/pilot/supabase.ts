import "server-only";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Publishable-key client, server-only. Every table this touches (access_links,
// jobs, units, staff, buildings, building_cleaners, reports) carries an "app
// access" RLS policy — full read/write for public — matching the pattern n8n's
// sync/dispatch workflows already rely on. That means anyone holding this key
// (it's not secret — already embedded in client code and n8n workflows) can
// read/write these tables directly, not just through this app's server code.
// The trust boundary today is "this code runs on the server", not Postgres
// policy. Revisit before onboarding real hosts/cleaners.
export function getServiceClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } }
  );
}
