"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/pilot/supabase";
import { usesFakeData } from "@/lib/pilot/mode";
import { issueAdminCode } from "@/lib/auth/codes";
import { revokeAllDevices } from "@/lib/auth/devices";
import { normalizePhone } from "@/lib/auth/phone";
import { recordEvent } from "@/lib/auth/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { cleanText, validatePrice } from "@/lib/pilot/validation";

type Result = { success: true } | { success: false; message: string };
const DENIED: Result = { success: false, message: "Admins only" };

async function requireAdmin() {
  const session = await requireSession("/pilot/team?tab=admin");
  if (!session.isAdmin || usesFakeData()) return null;
  return session;
}

const done = (): Result => {
  revalidatePath("/pilot/team");
  return { success: true };
};

export async function createAccount(input: {
  name: string;
  phone: string;
  staffId?: string | null;
  customerId?: string | null;
}): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const phone = normalizePhone(input.phone);
  const name = cleanText(input.name, 80);
  if (!phone) return { success: false, message: "Enter a valid phone number" };
  if (!name) return { success: false, message: "Enter a name" };
  const { error } = await getServiceClient()
    .from("accounts")
    .insert({
      phone_e164: phone,
      display_name: name,
      staff_id: input.staffId || null,
      customer_id: input.customerId || null,
    });
  if (error) {
    return { success: false, message: error.code === "23505" ? "That phone number already has an account" : "Could not create account" };
  }
  await recordEvent("admin_account_created", { actorAccountId: admin.accountId });
  return done();
}

// Lost phone / new number: set the number directly and sign out everywhere.
export async function changeAccountPhone(accountId: string, newPhone: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const phone = normalizePhone(newPhone);
  if (!phone) return { success: false, message: "Enter a valid phone number" };
  const { error } = await getServiceClient().from("accounts").update({ phone_e164: phone }).eq("id", accountId);
  if (error) {
    return { success: false, message: error.code === "23505" ? "That number belongs to another account" : "Could not update" };
  }
  await revokeAllDevices(accountId);
  await recordEvent("admin_phone_change", { accountId, actorAccountId: admin.accountId });
  return done();
}

// "Give them a code": shown once to the admin to read out. 10 minutes, single use.
export async function issueLoginCode(
  accountId: string
): Promise<{ success: true; code: string; phone: string } | { success: false; message: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, message: "Admins only" };
  const { data: account } = await getServiceClient()
    .from("accounts")
    .select("id, phone_e164, active")
    .eq("id", accountId)
    .maybeSingle();
  if (!account || !account.active) return { success: false, message: "Account not found" };
  const { code } = await issueAdminCode(account.id, account.phone_e164);
  await recordEvent("admin_code_issued", { accountId, actorAccountId: admin.accountId });
  return { success: true, code, phone: account.phone_e164 };
}

export async function revokeAccountDevices(accountId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  await revokeAllDevices(accountId);
  await recordEvent("device_revoked", { accountId, actorAccountId: admin.accountId });
  return done();
}

export async function setAccountActive(accountId: string, active: boolean): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  if (accountId === admin.accountId && !active) return { success: false, message: "You can't deactivate yourself" };
  await getServiceClient().from("accounts").update({ active }).eq("id", accountId);
  if (!active) await revokeAllDevices(accountId);
  await recordEvent(active ? "account_activated" : "account_deactivated", { accountId, actorAccountId: admin.accountId });
  return done();
}

export async function setBuildingMode(buildingId: string, mode: "lcp" | "self"): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  if (mode !== "lcp" && mode !== "self") return { success: false, message: "Invalid mode" };
  await getServiceClient().from("buildings").update({ management_mode: mode }).eq("id", buildingId);
  return done();
}

export async function setBuildingOwner(buildingId: string, customerId: string | null): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  await getServiceClient().from("buildings").update({ customer_id: customerId || null }).eq("id", buildingId);
  return done();
}

export async function createCustomer(name: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const clean = cleanText(name, 80);
  if (!clean) return { success: false, message: "Enter a name" };
  await getServiceClient().from("customers").insert({ name: clean });
  return done();
}

export async function setUnitRate(unitId: string, rate: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const value = rate.trim() === "" ? null : validatePrice(rate);
  if (rate.trim() !== "" && value === null) return { success: false, message: "Enter a valid rate" };
  await getServiceClient().from("units").update({ standard_rate: value }).eq("id", unitId);
  return done();
}
