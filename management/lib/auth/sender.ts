import "server-only";
import { usesFakeData } from "@/lib/pilot/mode";

// Delivery goes through n8n (which owns the Quo/OpenPhone credential). The webhook is
// authenticated with a shared secret and idempotent on `idempotencyKey`, so retries
// cannot produce duplicate texts.
async function post(urlEnv: string, body: Record<string, unknown>): Promise<boolean> {
  const url = process.env[urlEnv];
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-secret": secret },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendOtp(to: string, code: string, idempotencyKey: string): Promise<boolean> {
  if (usesFakeData()) return true;
  const ok = await post("N8N_OTP_WEBHOOK_URL", { to, code, idempotencyKey });
  if (!ok && process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOG_CODES === "true") {
    // Local development only, and only when explicitly enabled.
    console.warn(`[auth:dev] OTP delivery not configured; code for ${to.slice(-4)} is ${code}`);
    return true;
  }
  return ok;
}

// Nudge the notification dispatcher. Best effort: n8n also polls pending outbox rows, and the
// outbox's dedupe_key makes repeated delivery attempts safe.
export async function kickNotifications(hint: Record<string, string> = {}): Promise<void> {
  if (usesFakeData()) return;
  await post("N8N_NOTIFY_WEBHOOK_URL", hint);
}
