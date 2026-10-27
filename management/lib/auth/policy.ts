import { AUTH, DAY_MS } from "@/lib/auth/config";

// Pure decision helpers (no I/O) so the security rules are unit-testable.

export function deviceExpiry(verifiedAt: Date, now: Date) {
  const hard = new Date(verifiedAt.getTime() + AUTH.deviceHardDays * DAY_MS);
  const idle = new Date(Math.min(now.getTime() + AUTH.deviceIdleDays * DAY_MS, hard.getTime()));
  return { idle, hard };
}

export type DeviceState = "ok" | "revoked" | "idle_expired" | "hard_expired";

export function deviceState(
  d: { revoked_at: string | null; idle_expires_at: string; hard_expires_at: string },
  now: Date
): DeviceState {
  if (d.revoked_at) return "revoked";
  if (new Date(d.hard_expires_at) <= now) return "hard_expired";
  if (new Date(d.idle_expires_at) <= now) return "idle_expired";
  return "ok";
}

// New idle expiry after use: slides forward but never past the hard cap.
export function slideIdle(d: { hard_expires_at: string }, now: Date): Date {
  return new Date(
    Math.min(now.getTime() + AUTH.deviceIdleDays * DAY_MS, new Date(d.hard_expires_at).getTime())
  );
}

export function shouldTouch(lastSeenAt: string, now: Date): boolean {
  return now.getTime() - new Date(lastSeenAt).getTime() >= AUTH.touchIntervalMs;
}

export type CodeState = "ok" | "consumed" | "expired" | "locked";

export function codeState(
  c: { consumed_at: string | null; expires_at: string; attempts: number },
  now: Date
): CodeState {
  if (c.consumed_at) return "consumed";
  if (new Date(c.expires_at) <= now) return "expired";
  if (c.attempts >= AUTH.maxCodeAttempts) return "locked";
  return "ok";
}

export function overLimit(count: number, max: number): boolean {
  return count >= max;
}
