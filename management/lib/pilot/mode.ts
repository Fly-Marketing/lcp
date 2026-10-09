import "server-only";

// Single source of truth for whether pilot code talks to real Supabase or
// in-memory fake data. Defaults to fake (safe) — real DB access requires
// explicitly setting PILOT_USE_FAKE_DATA=false.
export function usesFakeData(): boolean {
  return process.env.PILOT_USE_FAKE_DATA !== "false";
}
