// Role checks against the REAL database (RUN_DB_TESTS=1). Creates a test property and three test
// accounts on fictional 555 numbers. Nothing is texted: the test calls the service layer directly.
// Everything it creates is removed in afterAll.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getServiceClient } from "@/lib/pilot/supabase";
import type { Session, Grant } from "@/lib/auth/types";

const run = process.env.RUN_DB_TESTS === "1";
const PHONES = { owner: "+15555550101", manager: "+15555550102", cleaner: "+15555550103", stranger: "+15555550104" };
const digits = (p: string) => p.slice(-10);

describe.skipIf(!run)("real database: roles", () => {
  const db = () => getServiceClient();
  const ids: Record<string, string> = {};
  const jobIds: string[] = [];

  beforeAll(async () => {
    // Clear leftovers from an earlier interrupted run.
    await db().from("accounts").delete().in("phone_e164", Object.values(PHONES));
    await db().from("buildings").delete().eq("name", "TEST Roles Property");
    await db().from("customers").delete().eq("name", "TEST Roles Owner");
    await db().from("staff").delete().eq("name", "TEST Roles Cleaner");

    const customer = await db().from("customers").insert({ name: "TEST Roles Owner", mobile: digits(PHONES.owner) }).select("id").single();
    ids.customer = customer.data!.id;
    const staff = await db().from("staff").insert({ name: "TEST Roles Cleaner", mobile: digits(PHONES.cleaner), active: true, taking_new_work: true, new_job_alerts: false }).select("id").single();
    ids.staff = staff.data!.id;
    const building = await db().from("buildings").insert({ name: "TEST Roles Property", management_mode: "lcp", customer_id: ids.customer }).select("id").single();
    ids.building = building.data!.id;
    const unit = await db().from("units").insert({ building_id: ids.building, unit_name: "TEST Unit 1", standard_rate: 120, active: true }).select("id").single();
    ids.unit = unit.data!.id;
    await db().from("building_cleaners").insert({ building_id: ids.building, staff_id: ids.staff, role: "primary" });

    const accounts = await db()
      .from("accounts")
      .insert([
        { phone_e164: PHONES.owner, display_name: "TEST Owner", customer_id: ids.customer },
        { phone_e164: PHONES.manager, display_name: "TEST Manager" },
        { phone_e164: PHONES.cleaner, display_name: "TEST Cleaner", staff_id: ids.staff },
        { phone_e164: PHONES.stranger, display_name: "TEST Stranger" },
      ])
      .select("id, phone_e164");
    for (const a of accounts.data ?? []) {
      if (a.phone_e164 === PHONES.owner) ids.owner = a.id;
      if (a.phone_e164 === PHONES.manager) ids.manager = a.id;
      if (a.phone_e164 === PHONES.cleaner) ids.cleaner = a.id;
      if (a.phone_e164 === PHONES.stranger) ids.stranger = a.id;
    }
    await db().from("role_assignments").insert({ account_id: ids.manager, role: "manager", building_id: ids.building, can_edit_price: false, is_primary: true });
  });

  afterAll(async () => {
    for (const id of jobIds) {
      await db().from("job_price_history").delete().eq("job_id", id);
      await db().from("notification_outbox").delete().eq("payload->>job_id", id);
      await db().from("jobs").delete().eq("id", id);
    }
    await db().from("role_assignments").delete().eq("building_id", ids.building);
    await db().from("building_cleaners").delete().eq("building_id", ids.building);
    await db().from("units").delete().eq("building_id", ids.building);
    await db().from("accounts").delete().in("phone_e164", Object.values(PHONES));
    await db().from("buildings").delete().eq("id", ids.building);
    await db().from("staff").delete().eq("id", ids.staff);
    await db().from("customers").delete().eq("id", ids.customer);
  });

  // Sessions built the same way lib/auth/session.ts builds them, from the same grant rules.
  const sessionFor = (accountId: string, extra: Partial<Session>, grants: Grant[]): Session => ({
    accountId,
    displayName: "test",
    staffId: null,
    customerId: null,
    isAdmin: false,
    deviceId: null,
    grants,
    ...extra,
  });
  const owner = () => sessionFor(ids.owner, { customerId: ids.customer }, [
    { role: "owner", buildingId: ids.building, managementMode: "lcp", canEditPrice: false, isPrimary: false },
  ]);
  const manager = () => sessionFor(ids.manager, {}, [
    { role: "manager", buildingId: ids.building, managementMode: "lcp", canEditPrice: false, isPrimary: true },
  ]);
  const cleaner = () => sessionFor(ids.cleaner, { staffId: ids.staff }, [
    { role: "cleaner", buildingId: ids.building, managementMode: "lcp", canEditPrice: false, isPrimary: false },
  ]);
  const stranger = () => sessionFor(ids.stranger, {}, []);

  it("owner and manager see the property; cleaner and stranger do not", async () => {
    const svc = await import("@/lib/pilot/service");
    const ownerBoard = await svc.propertiesBoard(owner());
    expect(ownerBoard.map((g) => g.building.id)).toEqual([ids.building]);
    const managerBoard = await svc.propertiesBoard(manager());
    expect(managerBoard.map((g) => g.building.id)).toEqual([ids.building]);
    expect(await svc.propertiesBoard(cleaner())).toEqual([]);
    expect(await svc.propertiesBoard(stranger())).toEqual([]);
  });

  it("only the owner and manager see the managed jobs list; the cleaner sees open work", async () => {
    const svc = await import("@/lib/pilot/service");
    const { createManualJob } = svc;
    const made = await createManualJob(owner(), {
      unitId: ids.unit,
      date: "2027-07-01",
      idempotencyKey: `roles-${Date.now()}`,
    });
    expect(made.success).toBe(true);
    if (!made.success) return;
    jobIds.push(made.data.jobId);

    expect((await svc.listManagedJobs(owner(), { scope: "upcoming" })).some((j) => j.id === made.data.jobId)).toBe(true);
    expect((await svc.listManagedJobs(manager(), { scope: "upcoming" })).some((j) => j.id === made.data.jobId)).toBe(true);
    expect(await svc.listManagedJobs(cleaner(), { scope: "upcoming" })).toEqual([]);

    const open = await svc.listOpenJobsForCleaner(cleaner());
    expect(open.some((j) => j.id === made.data.jobId)).toBe(true);
    expect(open.every((j) => j.price === null)).toBe(true);
    expect(await svc.listOpenJobsForCleaner(stranger())).toEqual([]);
  });

  it("only a manager with price permission can set a job price; owners and cleaners cannot", async () => {
    const svc = await import("@/lib/pilot/service");
    const jobId = jobIds[0];
    expect(jobId).toBeTruthy();
    expect((await svc.setJobPrice(owner(), jobId, 150, null)).success).toBe(false);
    expect((await svc.setJobPrice(cleaner(), jobId, 150, null)).success).toBe(false);
    // The manager here has no price permission (can_edit_price = false).
    expect((await svc.setJobPrice(manager(), jobId, 150, null)).success).toBe(false);
    // Admins may always set prices.
    const admin = sessionFor(ids.manager, { isAdmin: true }, [
      { role: "manager", buildingId: ids.building, managementMode: "lcp", canEditPrice: true, isPrimary: true },
    ]);
    expect((await svc.setJobPrice(admin, jobId, 150, "roles test")).success).toBe(true);
  });

  it("a cleaner never sees another cleaner's accepted job detail", async () => {
    const svc = await import("@/lib/pilot/service");
    const jobId = jobIds[0];
    const otherCleaner = sessionFor(ids.stranger, { staffId: "00000000-0000-0000-0000-000000000009" }, [
      { role: "cleaner", buildingId: ids.building, managementMode: "lcp", canEditPrice: false, isPrimary: false },
    ]);
    expect(await svc.getJobForViewer(otherCleaner, jobId)).toBeTruthy(); // open, unclaimed work is visible
    // Once the cleaner accepts, it stops being visible to anyone else.
    const { error } = await db().from("jobs").update({ assigned_staff_id: ids.staff, status: "Claimed" }).eq("id", jobId);
    expect(error).toBeNull();
    expect(await svc.getJobForViewer(otherCleaner, jobId)).toBeNull();
  });
});
