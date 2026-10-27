// Runs against the REAL Supabase project, only when RUN_DB_TESTS=1 (needs .env.local values in the
// environment). Everything it creates is removed in afterAll. Never part of the default `pnpm test`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getServiceClient } from "@/lib/pilot/supabase";

const run = process.env.RUN_DB_TESTS === "1";

const BUILDING = "547bf7f3-e1c9-46e7-afe1-b5a8ceb5a9f5"; // Macewan B&B
const SUITE_6 = "8b547697-2693-44eb-9b37-e6e818402b1e";
const TEST_PHONE = "+15875550199";
const FAR_DATE = "2027-06-01";

describe.skipIf(!run)("real database", () => {
  let accountId = "";
  const db = () => getServiceClient();
  const createdJobs: string[] = [];

  beforeAll(async () => {
    await db().from("accounts").delete().eq("phone_e164", TEST_PHONE);
    const { data, error } = await db()
      .from("accounts")
      .insert({ phone_e164: TEST_PHONE, display_name: "ZZ Integration Test" })
      .select("id")
      .single();
    if (error) throw error;
    accountId = data.id;
  });

  afterAll(async () => {
    for (const id of createdJobs) {
      await db().from("job_price_history").delete().eq("job_id", id);
      await db().from("notification_outbox").delete().in("dedupe_key", [`job_created:${id}`, `special_request:${id}`]);
      await db().from("jobs").delete().eq("id", id);
    }
    await db().from("verification_codes").delete().eq("phone_e164", TEST_PHONE);
    await db().from("trusted_devices").delete().eq("account_id", accountId);
    await db().from("auth_events").delete().eq("account_id", accountId);
    await db().from("accounts").delete().eq("id", accountId);
  });

  it("sign-in codes are single use and lock after too many wrong guesses", async () => {
    const { issueAdminCode, verifyCode } = await import("@/lib/auth/codes");
    const { code } = await issueAdminCode(accountId, TEST_PHONE);
    const wrong = code === "000000" ? "111111" : "000000";

    expect((await verifyCode(TEST_PHONE, wrong, ["admin_issued"], "ip-1")).ok).toBe(false);
    const good = await verifyCode(TEST_PHONE, code, ["login", "admin_issued"], "ip-1");
    expect(good.ok).toBe(true);
    expect((await verifyCode(TEST_PHONE, code, ["login", "admin_issued"], "ip-1")).ok).toBe(false); // reused

    const second = await issueAdminCode(accountId, TEST_PHONE);
    const bad = second.code === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i++) await verifyCode(TEST_PHONE, bad, ["admin_issued"], `ip-${i}`);
    expect((await verifyCode(TEST_PHONE, second.code, ["admin_issued"], "ip-9")).ok).toBe(false); // locked out
  });

  it("trusted devices resolve, then stop working once revoked", async () => {
    const { createDevice, resolveDevice, revokeDevice, listDevices } = await import("@/lib/auth/devices");
    const { token, deviceId } = await createDevice(accountId, "vitest");
    expect((await resolveDevice(token))?.id).toBe(deviceId);
    expect(await resolveDevice(token + "x")).toBeNull();
    expect((await listDevices(accountId)).length).toBe(1);
    await revokeDevice(accountId, deviceId);
    expect(await resolveDevice(token)).toBeNull();
  });

  it("owner board, scoping, manual job, dedupe, outbox and pricing work end to end", async () => {
    const svc = await import("@/lib/pilot/service");
    const { grantsOwner, grantsCleaner, grantsManager } = {
      grantsOwner: [{ role: "owner" as const, buildingId: BUILDING, managementMode: "lcp" as const, canEditPrice: false, isPrimary: false }],
      grantsCleaner: [{ role: "cleaner" as const, buildingId: BUILDING, managementMode: "lcp" as const, canEditPrice: false, isPrimary: false }],
      grantsManager: [{ role: "manager" as const, buildingId: BUILDING, managementMode: "lcp" as const, canEditPrice: true, isPrimary: true }],
    };
    const base = { accountId, displayName: "t", staffId: null, customerId: null, isAdmin: false, deviceId: null };
    const owner = { ...base, customerId: "0e69f979-8ce8-43de-a04d-cace9376d3d4", grants: grantsOwner };
    const manager = { ...base, staffId: "00000000-0000-0000-0000-000000000001", grants: grantsManager };
    const cleaner = { ...base, staffId: "e39c3e9a-8db7-4342-8e2f-9b9bbde22b13", grants: grantsCleaner };
    const stranger = { ...base, grants: [] };

    const board = await svc.propertiesBoard(owner);
    expect(board.length).toBe(1);
    expect(board[0].cards.length).toBe(6);
    expect(await svc.propertiesBoard(stranger)).toEqual([]);

    const open = await svc.listOpenJobsForCleaner(cleaner);
    expect(open.every((j) => j.price === null)).toBe(true);
    expect(await svc.listOpenJobsForCleaner(stranger)).toEqual([]);

    const key = `it-${Date.now()}-aaaa`;
    const made = await svc.createManualJob(owner, { unitId: SUITE_6, date: FAR_DATE, specialRequest: "  integration test  ", idempotencyKey: key });
    expect(made.success).toBe(true);
    if (!made.success) return;
    createdJobs.push(made.data.jobId);
    expect(made.data.status).toBe("created");

    const replay = await svc.createManualJob(owner, { unitId: SUITE_6, date: FAR_DATE, idempotencyKey: key });
    expect(replay.success).toBe(true);
    const dup = await svc.createManualJob(owner, { unitId: SUITE_6, date: FAR_DATE, idempotencyKey: `${key}-other` });
    expect(dup.success).toBe(false);
    expect((await svc.createManualJob(stranger, { unitId: SUITE_6, date: FAR_DATE, idempotencyKey: `${key}-x` })).success).toBe(false);

    const { data: outbox } = await db().from("notification_outbox").select("event_type, status").in("dedupe_key", [`job_created:${made.data.jobId}`, `special_request:${made.data.jobId}`]);
    expect((outbox ?? []).map((o) => o.event_type).sort()).toEqual(["job_created", "special_request"]);

    const job = await svc.getJobForViewer(owner, made.data.jobId);
    expect(job?.specialRequest).toBe("integration test");
    expect(job?.price).toBeNull(); // no standard rate configured yet

    expect((await svc.setJobPrice(owner, made.data.jobId, 150, null)).success).toBe(false);
    expect((await svc.setJobPrice(manager, made.data.jobId, 150, "test")).success).toBe(true);
    expect((await svc.setJobPrice(manager, made.data.jobId, 175, null)).success).toBe(true);
    const hist = await svc.getPriceHistory(manager, made.data.jobId);
    expect(hist.map((h) => h.newPrice)).toEqual([175, 150]);
    expect((await svc.getJobForViewer(cleaner, made.data.jobId))?.price ?? null).toBeNull();

    const sourceRow = await db().from("jobs").select("source, job_key").eq("id", made.data.jobId).single();
    expect(sourceRow.data?.source).toBe("owner_manual");
    expect(sourceRow.data?.job_key.startsWith("Suite 6|owner_manual:")).toBe(true);
  });
});
