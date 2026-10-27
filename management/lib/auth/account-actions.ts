"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceClient } from "@/lib/pilot/supabase";
import { usesFakeData } from "@/lib/pilot/mode";
import { getAccount } from "@/lib/auth/accounts";
import { issueAndSend, verifyCode } from "@/lib/auth/codes";
import { revokeAllDevices, revokeDevice } from "@/lib/auth/devices";
import { isLimited, limiterKey, recordEvent } from "@/lib/auth/rate-limit";
import { normalizePhone } from "@/lib/auth/phone";
import { clearDeviceCookie, getSession, requestMeta, requireSession } from "@/lib/auth/session";
import { AUTH } from "@/lib/auth/config";

export interface PhoneChangeState {
  step: "start" | "current" | "new" | "done";
  newPhone: string; // E.164 the user asked for
  error: string | null;
}

const START: PhoneChangeState = { step: "start", newPhone: "", error: null };

export async function signOutThisDevice() {
  const session = await getSession();
  if (session?.deviceId && !usesFakeData()) await revokeDevice(session.accountId, session.deviceId);
  await clearDeviceCookie();
  redirect("/pilot/signin");
}

export async function signOutOtherDevices(): Promise<{ success: boolean }> {
  const session = await requireSession("/pilot/account");
  if (!usesFakeData()) await revokeAllDevices(session.accountId, session.deviceId);
  revalidatePath("/pilot/account");
  return { success: true };
}

export async function signOutDevice(deviceId: string): Promise<{ success: boolean }> {
  const session = await requireSession("/pilot/account");
  if (!usesFakeData()) {
    await revokeDevice(session.accountId, deviceId);
    // Revoking the device you are on signs you out.
    if (deviceId === session.deviceId) {
      await clearDeviceCookie();
      redirect("/pilot/signin");
    }
  }
  revalidatePath("/pilot/account");
  return { success: true };
}

// Step 1: ask for a new number. A code goes to the CURRENT number first.
async function startPhoneChange(_prev: PhoneChangeState, formData: FormData): Promise<PhoneChangeState> {
  const session = await requireSession("/pilot/account");
  if (usesFakeData()) return { step: "current", newPhone: "+15875550100", error: null };

  const newPhone = normalizePhone(String(formData.get("newPhone") ?? ""));
  if (!newPhone) return { ...START, error: "Enter a valid 10-digit phone number." };

  const account = await getAccount(session.accountId);
  if (!account) return { ...START, error: "Something went wrong. Please sign in again." };
  if (newPhone === account.phone_e164) return { ...START, error: "That's already your number." };

  const key = limiterKey("phone", account.phone_e164);
  if (await isLimited("code_sent", key, 15 * 60 * 1000, AUTH.limits.codesPerPhone15Min)) {
    return { ...START, error: "Too many attempts. Please wait a few minutes." };
  }
  await recordEvent("code_sent", { key, accountId: account.id });

  const sent = await issueAndSend({
    phoneE164: account.phone_e164,
    purpose: "change_phone_current",
    accountId: account.id,
    newPhoneE164: newPhone,
  });
  if (!sent.ok) return { ...START, error: "We couldn't send a code right now. Please try again shortly." };
  return { step: "current", newPhone, error: null };
}

// Step 2: prove control of the CURRENT number; only then is a code sent to the new number.
async function confirmCurrentNumber(prev: PhoneChangeState, formData: FormData): Promise<PhoneChangeState> {
  const session = await requireSession("/pilot/account");
  if (usesFakeData()) return { step: "new", newPhone: prev.newPhone, error: null };

  const account = await getAccount(session.accountId);
  if (!account) return { ...START, error: "Something went wrong. Please sign in again." };
  const { ip } = await requestMeta();
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");

  const result = await verifyCode(account.phone_e164, code, ["change_phone_current"], ip);
  if (!result.ok || result.accountId !== account.id || !result.newPhoneE164) {
    return { ...prev, error: "That code isn't right or has expired." };
  }

  const newPhone = result.newPhoneE164;
  const key = limiterKey("phone", newPhone);
  if (await isLimited("code_sent", key, 15 * 60 * 1000, AUTH.limits.codesPerPhone15Min)) {
    return { ...START, error: "Too many attempts. Please wait a few minutes." };
  }
  await recordEvent("code_sent", { key, accountId: account.id });

  const sent = await issueAndSend({
    phoneE164: newPhone,
    purpose: "change_phone_new",
    accountId: account.id,
    newPhoneE164: newPhone,
  });
  if (!sent.ok) return { ...START, error: "We couldn't text the new number. Please try again." };
  return { step: "new", newPhone, error: null };
}

// Step 3: prove control of the NEW number; then swap it and sign out every other device.
async function confirmNewNumber(prev: PhoneChangeState, formData: FormData): Promise<PhoneChangeState> {
  const session = await requireSession("/pilot/account");
  if (usesFakeData()) return { step: "done", newPhone: prev.newPhone, error: null };

  const { ip } = await requestMeta();
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const newPhone = normalizePhone(prev.newPhone);
  if (!newPhone) return { ...START, error: "Please start again." };

  const result = await verifyCode(newPhone, code, ["change_phone_new"], ip);
  if (!result.ok || result.accountId !== session.accountId) {
    return { ...prev, error: "That code isn't right or has expired." };
  }

  const { error } = await getServiceClient()
    .from("accounts")
    .update({ phone_e164: newPhone })
    .eq("id", session.accountId);
  if (error) {
    return { ...START, error: "That number is already in use by another account. Contact LCP for help." };
  }
  await revokeAllDevices(session.accountId, session.deviceId);
  await recordEvent("phone_changed", { accountId: session.accountId, actorAccountId: session.accountId });
  revalidatePath("/pilot/account");
  return { step: "done", newPhone, error: null };
}

// Single entry point: the step carried in `prev` decides what this submission means.
// Each step re-checks the session and the previous step's proof server-side.
export async function phoneChangeAction(prev: PhoneChangeState, formData: FormData): Promise<PhoneChangeState> {
  if (prev.step === "current") return confirmCurrentNumber(prev, formData);
  if (prev.step === "new") return confirmNewNumber(prev, formData);
  return startPhoneChange(prev, formData);
}
