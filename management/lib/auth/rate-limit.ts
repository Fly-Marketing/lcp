import "server-only";
import { getServiceClient } from "@/lib/pilot/supabase";
import { hmac, requireAuthSecret } from "@/lib/auth/crypto";
import { overLimit } from "@/lib/auth/policy";

// Keys are HMAC'd so raw phone numbers / IPs never sit in auth_events.
export function limiterKey(kind: "phone" | "ip", value: string): string {
  return `${kind}:${hmac(requireAuthSecret(), `${kind}:${value}`).slice(0, 32)}`;
}

export async function recordEvent(
  kind: string,
  opts: { key?: string; accountId?: string | null; actorAccountId?: string | null } = {}
) {
  const supabase = getServiceClient();
  await supabase.from("auth_events").insert({
    kind,
    key: opts.key ?? null,
    account_id: opts.accountId ?? null,
    actor_account_id: opts.actorAccountId ?? null,
  });
}

export async function countEvents(kind: string, key: string, windowMs: number): Promise<number> {
  const supabase = getServiceClient();
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count } = await supabase
    .from("auth_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .eq("key", key)
    .gte("created_at", since);
  return count ?? 0;
}

export async function isLimited(kind: string, key: string, windowMs: number, max: number): Promise<boolean> {
  return overLimit(await countEvents(kind, key, windowMs), max);
}
