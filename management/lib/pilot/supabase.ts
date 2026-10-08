import "server-only";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Publishable-key client, server-only. Not using the service-role key —
// RLS policies on access_links/jobs/units/buildings/building_cleaners/staff/
// reports are deliberately open (using true) to let this key do what the
// pilot needs. That means anyone holding this key (it's not secret — it's
// embedded in client code and n8n workflows already) can read/write those
// tables directly, not just through this app's server code. Revisit before
// onboarding real hosts/cleaners — tighten policies or switch to the
// service-role key once it's available.
export function getServiceClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } }
  );
}
