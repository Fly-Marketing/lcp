"use server";

import { redirect } from "next/navigation";
import { requestLoginCode, verifyCode } from "@/lib/auth/codes";
import { createDevice, revokeDevice } from "@/lib/auth/devices";
import { normalizePhone } from "@/lib/auth/phone";
import { recordEvent } from "@/lib/auth/rate-limit";
import { clearDeviceCookie, getSession, requestMeta, setDeviceCookie } from "@/lib/auth/session";
import { safeReturnTo } from "@/lib/auth/return-to";
import { usesFakeData } from "@/lib/pilot/mode";

export interface SignInState {
  step: "phone" | "code";
  phone: string; // E.164, echoed back to the form (the user typed it)
  returnTo: string;
  error: string | null;
  notice: string | null;
}

const GENERIC_SENT = "If that number is registered, we've sent a 6-digit code.";

export async function requestCodeAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? ""));
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) {
    return { step: "phone", phone: "", returnTo, error: "Enter a valid 10-digit phone number.", notice: null };
  }
  const { ip } = await requestMeta();
  const result = await requestLoginCode(phone, ip);
  if (!result.ok && result.reason === "rate_limited") {
    return { step: "phone", phone: "", returnTo, error: "Too many attempts. Please wait a few minutes and try again.", notice: null };
  }
  if (!result.ok) {
    return { step: "phone", phone: "", returnTo, error: "We couldn't send a code right now. Please try again shortly.", notice: null };
  }
  return { step: "code", phone, returnTo, error: null, notice: GENERIC_SENT };
}

export async function verifyCodeAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? ""));
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!phone) return { step: "phone", phone: "", returnTo, error: "Enter your phone number again.", notice: null };

  const { ip, userAgent } = await requestMeta();
  const result = await verifyCode(phone, code, ["login", "admin_issued"], ip);
  if (!result.ok) {
    const error =
      result.reason === "rate_limited"
        ? "Too many attempts. Please wait a few minutes and try again."
        : "That code isn't right or has expired. Check it and try again, or request a new one.";
    return { step: "code", phone, returnTo, error, notice: null };
  }

  if (!usesFakeData()) {
    const device = await createDevice(result.accountId, userAgent);
    await setDeviceCookie(device.token, device.hardExpiresAt);
    await recordEvent("login_ok", { accountId: result.accountId });
  }
  redirect(returnTo);
}

export async function signOutAction() {
  const session = await getSession();
  if (session?.deviceId && !usesFakeData()) {
    await revokeDevice(session.accountId, session.deviceId);
  }
  await clearDeviceCookie();
  redirect("/pilot/signin");
}
