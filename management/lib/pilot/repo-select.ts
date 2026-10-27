import "server-only";
import { usesFakeData } from "@/lib/pilot/mode";
import { createSupabaseRepo } from "@/lib/pilot/repo-supabase";
import { getFakeRepo } from "@/lib/pilot/repo-fake";
import type { PilotRepo } from "@/lib/pilot/repo";

let override: PilotRepo | null = null;

// Tests inject a repo here.
export function setRepoForTests(repo: PilotRepo | null) {
  override = repo;
}

export function getRepo(): PilotRepo {
  if (override) return override;
  return usesFakeData() ? getFakeRepo() : createSupabaseRepo();
}
