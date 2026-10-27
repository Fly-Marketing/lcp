import "server-only";
import { randomUUID } from "crypto";
import { getServiceClient } from "@/lib/pilot/supabase";
import { AUTH } from "@/lib/auth/config";
import { generateCode, hmac, requireAuthSecret, safeEqual } from "@/lib/auth/crypto";
import { codeState } from "@/lib/auth/policy";
import { findAccountByPhone } from "@/lib/auth/accounts";
import { isLimited, limiterKey, recordEvent } from "@/lib/auth/rate-limit";
import { sendOtp } from "@/lib/auth/sender";
import { usesFakeData } from "@/lib/pilot/mode";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export type Purpose = "login" | "change_phone_current" | "change_phone_new" | "admin_issued";

function codeHash(id: string, code: string): string {
  return hmac(requireAuthSecret(), `${id}:${code}`);
}

export const FAKE_CODE = "000000";

// --- request -------------------------------------------------------------

export type RequestResult = { ok: true } | { ok: false; reason: "rate_limited" | "send_failed" };

// Login: identical outward behaviour whether or not the number is registered.
export async function requestLoginCode(phoneE164: string, ipValue: string): Promise<RequestResult> {
  const phoneKey = limiterKey("phone", phoneE164);
  const ipKey = limiterKey("ip", ipValue);

  if (usesFakeData()) return { ok: true };

  if (
    (await isLimited("code_sent", phoneKey, 15 * MIN, AUTH.limits.codesPerPhone15Min)) ||
    (await isLimited("code_sent", phoneKey, DAY, AUTH.limits.codesPerPhonePerDay)) ||
    (await isLimited("code_sent", ipKey, HOUR, AUTH.limits.codesPerIpPerHour))
  ) {
    return { ok: false, reason: "rate_limited" };
  }

  // Count every request (registered or not) so responses and limits don't leak registration.
  await recordEvent("code_sent", { key: phoneKey });
  await recordEvent("code_sent", { key: ipKey });

  const account = await findAccountByPhone(phoneE164);
  if (!account) {
    // Burn comparable work so timing doesn't reveal registration.
    codeHash(randomUUID(), generateCode());
    return { ok: true };
  }
  return issueAndSend({ phoneE164, purpose: "login", accountId: account.id });
}

export async function issueAndSend(opts: {
  phoneE164: string;
  purpose: Purpose;
  accountId: string;
  newPhoneE164?: string | null;
}): Promise<RequestResult> {
  const supabase = getServiceClient();
  const id = randomUUID();
  const code = generateCode();

  // Only one live code per phone+purpose.
  await supabase
    .from("verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("phone_e164", opts.phoneE164)
    .eq("purpose", opts.purpose)
    .is("consumed_at", null);

  const { error } = await supabase.from("verification_codes").insert({
    id,
    phone_e164: opts.phoneE164,
    code_hash: codeHash(id, code),
    purpose: opts.purpose,
    account_id: opts.accountId,
    new_phone_e164: opts.newPhoneE164 ?? null,
    expires_at: new Date(Date.now() + AUTH.codeTtlMs).toISOString(),
  });
  if (error) return { ok: false, reason: "send_failed" };

  const sent = await sendOtp(opts.phoneE164, code, id);
  if (!sent) return { ok: false, reason: "send_failed" };
  return { ok: true };
}

// Admin "give them a code": returns the plaintext code ONCE for the admin to read out.
export async function issueAdminCode(accountId: string, phoneE164: string): Promise<{ code: string }> {
  const supabase = getServiceClient();
  const id = randomUUID();
  const code = generateCode();
  await supabase
    .from("verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("phone_e164", phoneE164)
    .eq("purpose", "admin_issued")
    .is("consumed_at", null);
  const { error } = await supabase.from("verification_codes").insert({
    id,
    phone_e164: phoneE164,
    code_hash: codeHash(id, code),
    purpose: "admin_issued",
    account_id: accountId,
    expires_at: new Date(Date.now() + AUTH.codeTtlMs).toISOString(),
  });
  if (error) throw new Error("Could not issue code");
  return { code };
}

// --- verify --------------------------------------------------------------

export type VerifyResult =
  | { ok: true; accountId: string; newPhoneE164: string | null; purpose: Purpose }
  | { ok: false; reason: "invalid" | "rate_limited" };

// Generic failure on purpose: callers must not distinguish "wrong", "expired", "locked" or "unknown phone".
export async function verifyCode(
  phoneE164: string,
  code: string,
  purposes: Purpose[],
  ipValue: string
): Promise<VerifyResult> {
  const fail = { ok: false, reason: "invalid" } as const;
  if (!/^\d{6}$/.test(code)) return fail;

  if (usesFakeData()) {
    return code === FAKE_CODE
      ? { ok: true, accountId: "fake-account", newPhoneE164: null, purpose: purposes[0] }
      : fail;
  }

  const phoneKey = limiterKey("phone", phoneE164);
  const ipKey = limiterKey("ip", ipValue);
  if (
    (await isLimited("code_failed", phoneKey, 15 * MIN, AUTH.limits.failedVerifiesPerPhone15Min)) ||
    (await isLimited("code_failed", ipKey, 15 * MIN, AUTH.limits.failedVerifiesPerPhone15Min * 3))
  ) {
    return { ok: false, reason: "rate_limited" };
  }

  const supabase = getServiceClient();
  const { data: rows } = await supabase
    .from("verification_codes")
    .select("id, code_hash, purpose, account_id, new_phone_e164, expires_at, consumed_at, attempts")
    .eq("phone_e164", phoneE164)
    .in("purpose", purposes)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(3);

  // At most a few live codes exist (e.g. a login code and an admin-issued code); try each.
  for (const row of rows ?? []) {
    if (codeState(row, new Date()) !== "ok") continue;

    // Count the attempt first (optimistic concurrency so parallel guesses can't exceed the limit).
    const { data: bumped } = await supabase
      .from("verification_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id)
      .eq("attempts", row.attempts)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();
    if (!bumped) continue;

    if (!safeEqual(row.code_hash, codeHash(row.id, code))) continue;

    // Single use: only one caller can flip consumed_at.
    const { data: consumed } = await supabase
      .from("verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();
    if (!consumed || !row.account_id) continue;

    return {
      ok: true,
      accountId: row.account_id,
      newPhoneE164: row.new_phone_e164,
      purpose: row.purpose as Purpose,
    };
  }

  await recordEvent("code_failed", { key: phoneKey });
  await recordEvent("code_failed", { key: ipKey });
  return fail;
}
