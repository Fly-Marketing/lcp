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

type Failure = { success: false; message: string };
type Result = { success: true } | Failure;
// Returned by create actions so the screen can select the new record.
type Created = { success: true; id: string } | Failure;
const DENIED: Failure = { success: false, message: "Admins only" };

async function requireAdmin() {
  const session = await requireSession("/pilot/management?tab=people");
  if (!session.isAdmin || usesFakeData()) return null;
  return session;
}

const done = (): Result => {
  revalidatePath("/pilot/management");
  return { success: true };
};

type AccountInput =
  | { role: "cleaner"; name: string; phone: string; buildingId?: string | null; cleanerRole?: "primary" | "backup"; isTest?: boolean }
  | { role: "owner"; name: string; phone: string; customerId?: string | null; isTest?: boolean }
  | { role: "manager"; name: string; phone: string; buildingId: string; canEditPrice: boolean; isPrimary: boolean; isTest?: boolean };

// Creates one account for a cleaner, owner or manager, with the records that role needs.
// If a later step fails, the records created so far are removed again.
export async function createAccount(input: AccountInput): Promise<Created> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const phone = normalizePhone(input.phone);
  const name = cleanText(input.name, 80);
  if (!phone) return { success: false, message: "Enter a valid phone number" };
  if (!name) return { success: false, message: "Enter a name" };

  const supabase = getServiceClient();
  const { data: existing } = await supabase.from("accounts").select("id").eq("phone_e164", phone).maybeSingle();
  if (existing) return { success: false, message: "That phone number already has an account" };

  const created: { table: "staff" | "customers" | "accounts"; id: string }[] = [];
  const fail = async (message: string): Promise<Failure> => {
    for (const row of created.reverse()) await supabase.from(row.table).delete().eq("id", row.id);
    return { success: false, message };
  };

  let staffId: string | null = null;
  let customerId: string | null = null;

  if (input.role === "cleaner") {
    const { data, error } = await supabase
      .from("staff")
      .insert({ name, mobile: phone.slice(-10), active: true, taking_new_work: true, new_job_alerts: true })
      .select("id")
      .single();
    if (error || !data) return fail("Could not create the cleaner");
    staffId = data.id as string;
    created.push({ table: "staff", id: staffId });
  }

  if (input.role === "owner") {
    if (input.customerId) {
      customerId = input.customerId;
    } else {
      const { data, error } = await supabase.from("customers").insert({ name, mobile: phone.slice(-10) }).select("id").single();
      if (error || !data) return fail("Could not create the owner");
      customerId = data.id as string;
      created.push({ table: "customers", id: customerId });
    }
  }

  const { data: account, error } = await supabase
    .from("accounts")
    .insert({ phone_e164: phone, display_name: name, staff_id: staffId, customer_id: customerId, is_test: input.isTest === true })
    .select("id")
    .single();
  if (error || !account) return fail("Could not create account");
  created.push({ table: "accounts", id: account.id as string });

  if (input.role === "cleaner" && input.buildingId && staffId) {
    const { error: linkError } = await supabase.from("building_cleaners").insert({
      building_id: input.buildingId,
      staff_id: staffId,
      role: input.cleanerRole === "backup" ? "backup" : "primary",
    });
    if (linkError) return fail("Could not assign the cleaner to that property");
  }

  if (input.role === "manager") {
    const { error: roleError } = await supabase.from("role_assignments").insert({
      account_id: account.id,
      role: "manager",
      building_id: input.buildingId,
      can_edit_price: input.canEditPrice,
      is_primary: input.isPrimary,
    });
    if (roleError) {
      return fail(roleError.code === "23505" ? "That property already has a primary manager" : "Could not assign the manager");
    }
  }

  await recordEvent("admin_account_created", { actorAccountId: admin.accountId });
  revalidatePath("/pilot/management");
  return { success: true, id: account.id as string };
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

export async function createProperty(input: {
  name: string;
  address: string;
  mode: "lcp" | "self";
  customerId: string | null;
  isTest?: boolean;
}): Promise<Created> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const name = cleanText(input.name, 80);
  if (!name) return { success: false, message: "Enter a property name" };
  if (input.mode !== "lcp" && input.mode !== "self") return { success: false, message: "Invalid management mode" };

  const { data, error } = await getServiceClient()
    .from("buildings")
    .insert({
      name,
      address: cleanText(input.address, 200) || null,
      management_mode: input.mode,
      customer_id: input.customerId || null,
      is_test: input.isTest === true,
    })
    .select("id")
    .single();
  if (error || !data) return { success: false, message: "Could not create the property" };
  revalidatePath("/pilot/management");
  return { success: true, id: data.id as string };
}

export async function updateProperty(input: {
  id: string;
  name: string;
  address: string;
  mode: "lcp" | "self";
  customerId: string | null;
}): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const name = cleanText(input.name, 80);
  if (!name) return { success: false, message: "Enter a property name" };
  if (input.mode !== "lcp" && input.mode !== "self") return { success: false, message: "Invalid management mode" };
  const { error } = await getServiceClient()
    .from("buildings")
    .update({
      name,
      address: cleanText(input.address, 200),
      management_mode: input.mode,
      customer_id: input.customerId || null,
    })
    .eq("id", input.id);
  if (error) return { success: false, message: "Could not save the property" };
  return done();
}

// Pricing and schedule for a unit. Access notes and the checklist are saved from the unit card.
export async function updateUnit(input: {
  id: string;
  unitName: string;
  address: string;
  rate: string;
  expectedHours: string;
  checkoutTime: string;
}): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const unitName = cleanText(input.unitName, 60);
  if (!unitName) return { success: false, message: "Enter a unit name" };
  const rate = input.rate.trim() === "" ? null : validatePrice(input.rate);
  if (input.rate.trim() !== "" && rate === null) return { success: false, message: "Enter a valid rate" };
  const hours = input.expectedHours.trim() === "" ? null : Number(input.expectedHours);
  if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 24)) {
    return { success: false, message: "Enter expected hours between 0 and 24" };
  }
  const time = input.checkoutTime.trim() === "" ? null : input.checkoutTime.trim();
  if (time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { success: false, message: "Enter checkout time as HH:MM" };
  const { error } = await getServiceClient()
    .from("units")
    .update({
      unit_name: unitName,
      address: cleanText(input.address, 200),
      standard_rate: rate,
      expected_hours: hours,
      checkout_time: time,
    })
    .eq("id", input.id);
  if (error) return { success: false, message: "Could not save the unit" };
  return done();
}

export async function updateAccountName(accountId: string, name: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const clean = cleanText(name, 80);
  if (!clean) return { success: false, message: "Enter a name" };
  const { error } = await getServiceClient().from("accounts").update({ display_name: clean }).eq("id", accountId);
  if (error) return { success: false, message: "Could not save the name" };
  return done();
}

// Property assignments, managed from a person's card on the People tab.

export async function assignCleaner(staffId: string, buildingId: string, role: "primary" | "backup"): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("building_cleaners")
    .insert({ building_id: buildingId, staff_id: staffId, role });
  if (!error) return done();
  if (error.code !== "23505") return { success: false, message: "Could not assign the cleaner" };
  // Already linked before (and maybe removed): reinstate the link.
  const { error: updateError } = await supabase
    .from("building_cleaners")
    .update({ revoked_at: null, role })
    .eq("building_id", buildingId)
    .eq("staff_id", staffId);
  if (updateError) return { success: false, message: "Could not assign the cleaner" };
  return done();
}

export async function unassignCleaner(staffId: string, buildingId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const { error } = await getServiceClient()
    .from("building_cleaners")
    .update({ revoked_at: new Date().toISOString() })
    .eq("building_id", buildingId)
    .eq("staff_id", staffId);
  if (error) return { success: false, message: "Could not remove the cleaner" };
  return done();
}

export async function assignManager(
  accountId: string,
  buildingId: string,
  canEditPrice: boolean,
  isPrimary: boolean
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const supabase = getServiceClient();
  const { error } = await supabase.from("role_assignments").insert({
    account_id: accountId,
    role: "manager",
    building_id: buildingId,
    can_edit_price: canEditPrice,
    is_primary: isPrimary,
  });
  if (!error) return done();
  if (error.code === "23505" && error.message.includes("one_primary_manager_per_building")) {
    return { success: false, message: "That property already has a primary manager" };
  }
  if (error.code !== "23505") return { success: false, message: "Could not assign the manager" };
  // Already a manager there (and maybe removed): reinstate with the new settings.
  const { error: updateError } = await supabase
    .from("role_assignments")
    .update({ revoked_at: null, can_edit_price: canEditPrice, is_primary: isPrimary })
    .eq("account_id", accountId)
    .eq("role", "manager")
    .eq("building_id", buildingId);
  if (updateError) return { success: false, message: "That property already has a primary manager" };
  return done();
}

export async function unassignManager(accountId: string, buildingId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const { error } = await getServiceClient()
    .from("role_assignments")
    .update({ revoked_at: new Date().toISOString(), is_primary: false })
    .eq("account_id", accountId)
    .eq("role", "manager")
    .eq("building_id", buildingId);
  if (error) return { success: false, message: "Could not remove the manager" };
  return done();
}

// Units are created inside a property, with their standard rate.
export async function createUnit(input: { buildingId: string; unitName: string; rate: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  const unitName = cleanText(input.unitName, 60);
  if (!unitName) return { success: false, message: "Enter a unit name" };
  const rate = input.rate.trim() === "" ? null : validatePrice(input.rate);
  if (input.rate.trim() !== "" && rate === null) return { success: false, message: "Enter a valid rate" };
  const { error } = await getServiceClient()
    .from("units")
    .insert({ building_id: input.buildingId, unit_name: unitName, standard_rate: rate, active: true });
  if (error) return { success: false, message: "Could not add the unit" };
  return done();
}

