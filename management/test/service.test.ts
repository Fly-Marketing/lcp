import { beforeEach, describe, expect, it } from "vitest";
import {
  FAKE_STAFF_2,
  FAKE_STAFF_3,
  createFakeRepo,
} from "@/lib/pilot/repo-fake";
import { setRepoForTests } from "@/lib/pilot/repo-select";
import * as svc from "@/lib/pilot/service";
import { FAKE_BUILDING_A, FAKE_BUILDING_B, FAKE_STAFF_ID } from "@/lib/auth/fake-session";
import type { Grant, Session } from "@/lib/auth/types";
import { addDays, todayInEdmonton } from "@/lib/pilot/validation";

const A = FAKE_BUILDING_A;
const B = FAKE_BUILDING_B;
const grant = (role: Grant["role"], buildingId: string, extra: Partial<Grant> = {}): Grant => ({
  role,
  buildingId,
  managementMode: buildingId === B ? "self" : "lcp",
  canEditPrice: false,
  isPrimary: false,
  ...extra,
});
const sess = (id: string, over: Partial<Session>): Session => ({
  accountId: id,
  displayName: id,
  staffId: null,
  customerId: null,
  isAdmin: false,
  grants: [],
  deviceId: "d",
  ...over,
});

const eddy = sess("eddy", { staffId: FAKE_STAFF_ID, grants: [grant("cleaner", A)] });
const lydia = sess("lydia", { staffId: FAKE_STAFF_2, grants: [grant("cleaner", A)] });
const sam = sess("sam", { staffId: FAKE_STAFF_3, grants: [grant("cleaner", B)] });
const ownerA = sess("ownerA", { customerId: "fake-customer-1", grants: [grant("owner", A)] });
const ownerB = sess("ownerB", { customerId: "fake-customer-2", grants: [grant("owner", B)] });
const managerA = sess("managerA", {
  staffId: "mgr-staff",
  grants: [grant("manager", A, { canEditPrice: true, isPrimary: true })],
});
const managerNoPrice = sess("managerNP", { staffId: "mgr2", grants: [grant("manager", A)] });
const admin = sess("admin", {
  staffId: "adm",
  isAdmin: true,
  grants: [grant("manager", A, { canEditPrice: true }), grant("manager", B, { canEditPrice: true })],
});

let repo: ReturnType<typeof createFakeRepo>;
beforeEach(() => {
  repo = createFakeRepo();
  setRepoForTests(repo);
});

const ids = (jobs: { id: string }[]) => jobs.map((j) => j.id).sort();
const imgFor = (jobId: string) => `fake/${jobId}/x.jpg`;
const report = { description: "Broken lamp", category: "Maintenance Issue" as const, urgent: false, photoPaths: [] as string[] };

describe("cleaner reads", () => {
  it("lists only unclaimed, open work at the cleaner's own buildings", async () => {
    const jobs = await svc.listOpenJobsForCleaner(eddy);
    expect(ids(jobs)).toEqual(["fake-job-1", "fake-job-2", "fake-job-3", "fake-job-6"]);
    expect((await svc.listOpenJobsForCleaner(sam)).map((j) => j.id)).toEqual(["fake-job-b1"]);
  });

  it("my jobs are only the caller's own", async () => {
    expect(ids(await svc.listMyJobs(eddy))).toEqual(["fake-job-4", "fake-job-5"]);
    expect(ids(await svc.listMyJobs(lydia))).toEqual(["fake-job-7"]);
  });

  it("cleaners cannot open other cleaners' or other buildings' jobs", async () => {
    expect(await svc.getJobForViewer(eddy, "fake-job-1")).not.toBeNull();
    expect(await svc.getJobForViewer(eddy, "fake-job-4")).not.toBeNull(); // own completed
    expect(await svc.getJobForViewer(eddy, "fake-job-7")).toBeNull(); // Lydia's claimed job
    expect(await svc.getJobForViewer(eddy, "fake-job-b1")).toBeNull(); // other building
    expect(await svc.getJobForViewer(sam, "fake-job-1")).toBeNull();
    expect(await svc.getJobForViewer(eddy, "does-not-exist")).toBeNull();
  });

  it("never leaks customer price or cleaner pay to cleaners", async () => {
    const job = await svc.getJobForViewer(eddy, "fake-job-1");
    expect(job?.price).toBeNull();
    const all = JSON.stringify([...(await svc.listOpenJobsForCleaner(eddy)), ...(await svc.listMyJobs(eddy))]);
    expect(all).not.toMatch(/cleaner_?pay/i);
    expect(all).not.toContain('"price":1');
  });
});

describe("owner / manager reads", () => {
  it("owners see only their own buildings", async () => {
    const aBoard = await svc.propertiesBoard(ownerA);
    expect(aBoard.map((g) => g.building.id)).toEqual([A]);
    expect(aBoard[0].cards.map((c) => c.unit.name).sort()).toEqual(
      ["Suite 1", "Suite 2", "Suite 3B", "Suite 4", "Suite 5", "Suite 6"]
    );
    const bBoard = await svc.propertiesBoard(ownerB);
    expect(bBoard.map((g) => g.building.id)).toEqual([B]);
    expect(await svc.propertiesBoard(eddy)).toEqual([]);
  });

  it("owner can view any job in their building but not another building's", async () => {
    expect(await svc.getJobForViewer(ownerA, "fake-job-7")).not.toBeNull();
    expect(await svc.getJobForViewer(ownerA, "fake-job-b1")).toBeNull();
    expect(await svc.getJobForViewer(ownerB, "fake-job-1")).toBeNull();
  });

  it("owners see price and first name of the cleaner, not owner contact details", async () => {
    const job = await svc.getJobForViewer(ownerA, "fake-job-7");
    expect(job?.price).toBe(120);
    expect(job?.assignedCleanerName).toBe("Lydia");
    expect(job?.ownerMobile).toBeNull();
    expect(JSON.stringify(job)).not.toMatch(/7805559999/); // cleaner's phone is never included
  });

  it("board status counts follow job and report state", async () => {
    const [group] = await svc.propertiesBoard(ownerA);
    const by = Object.fromEntries(group.cards.map((c) => [c.unit.name, c.status]));
    expect(by["Suite 2"]).toBe("Flagged"); // open maintenance report on job-5
    expect(by["Suite 4"]).toBe("Ready"); // completed, nothing pending
    expect(by["Suite 1"]).toBe("Needs clean");
    expect(group.counts.Flagged).toBe(1);
  });

  it("history and upcoming scopes only include managed buildings", async () => {
    const up = await svc.listManagedJobs(ownerA, { scope: "upcoming" });
    expect(up.every((j) => j.buildingId === A)).toBe(true);
    const hist = await svc.listManagedJobs(ownerA, { scope: "history" });
    expect(ids(hist)).toEqual(["fake-job-4", "fake-job-5"]);
  });

  it("attention view is for managers only", async () => {
    expect((await svc.listManagedJobs(ownerA, { scope: "attention" })).length).toBe(0);
    const att = await svc.listManagedJobs(managerA, { scope: "attention" });
    expect(att.map((j) => j.id)).toContain("fake-job-7"); // special request
    expect(att.every((j) => j.buildingId === A)).toBe(true);
    expect((await svc.listManagedJobs(eddy, { scope: "attention" })).length).toBe(0);
  });
});

describe("accept / complete", () => {
  it("only one cleaner can win a job", async () => {
    expect((await svc.acceptJob(eddy, "fake-job-1")).success).toBe(true);
    const second = await svc.acceptJob(lydia, "fake-job-1");
    expect(second.success).toBe(false);
    expect((await repo.getJob("fake-job-1"))?.assignedStaffId).toBe(FAKE_STAFF_ID);
  });

  it("cleaners cannot accept other buildings' jobs; owners/managers cannot accept", async () => {
    expect((await svc.acceptJob(sam, "fake-job-1")).success).toBe(false);
    expect((await svc.acceptJob(eddy, "fake-job-b1")).success).toBe(false);
    expect((await svc.acceptJob(managerA, "fake-job-1")).success).toBe(false);
    expect((await svc.acceptJob(ownerA, "fake-job-1")).success).toBe(false);
    expect((await svc.acceptJob(eddy, "fake-job-7")).success).toBe(false); // already claimed
  });

  it("only the assigned cleaner can complete", async () => {
    await svc.acceptJob(eddy, "fake-job-1");
    expect((await svc.completeJob(lydia, "fake-job-1")).success).toBe(false);
    expect((await svc.completeJob(managerA, "fake-job-1")).success).toBe(false);
    expect((await svc.completeJob(eddy, "fake-job-1")).success).toBe(true);
    expect((await svc.completeJob(eddy, "fake-job-1")).success).toBe(false); // already done
  });

  it("result changes: assigned cleaner or manager, not other cleaners or owners", async () => {
    expect((await svc.setCompletedJobResult(lydia, "fake-job-4", "Not clean")).success).toBe(false);
    expect((await svc.setCompletedJobResult(ownerA, "fake-job-4", "Not clean")).success).toBe(false);
    expect((await svc.setCompletedJobResult(eddy, "fake-job-4", "Bogus")).success).toBe(false);
    expect((await svc.setCompletedJobResult(eddy, "fake-job-4", "Needs attention")).success).toBe(true);
    expect((await svc.setCompletedJobResult(managerA, "fake-job-4", "Completed")).success).toBe(true);
  });
});

describe("reports", () => {
  it("only the assigned cleaner or a manager can file a report", async () => {
    expect((await svc.createReport(lydia, "fake-job-4", report)).success).toBe(false);
    expect((await svc.createReport(sam, "fake-job-4", report)).success).toBe(false);
    expect((await svc.createReport(ownerA, "fake-job-4", report)).success).toBe(false);
    expect((await svc.createReport(eddy, "fake-job-4", report)).success).toBe(true);
    expect((await svc.createReport(managerA, "fake-job-4", report)).success).toBe(true);
  });

  it("author comes from the session, and photos must belong to the job", async () => {
    await svc.createReport(eddy, "fake-job-4", { ...report, photoPaths: [imgFor("fake-job-4")] });
    expect(repo.state.reports[0].staffId).toBe(FAKE_STAFF_ID);
    const bad = await svc.createReport(eddy, "fake-job-4", { ...report, photoPaths: [imgFor("fake-job-1")] });
    expect(bad.success).toBe(false);
    expect((await svc.createReport(eddy, "fake-job-4", { ...report, description: "  " })).success).toBe(false);
  });

  it("edit/delete: author or manager only", async () => {
    expect((await svc.editReport(lydia, "fake-report-1", report)).success).toBe(false);
    expect((await svc.removeReport(lydia, "fake-report-1")).success).toBe(false);
    expect((await svc.removeReport(ownerA, "fake-report-1")).success).toBe(false);
    expect((await svc.removeReport(sam, "fake-report-1")).success).toBe(false);
    expect((await svc.editReport(eddy, "fake-report-1", report)).success).toBe(true);
    expect((await svc.removeReport(managerA, "fake-report-1")).success).toBe(true);
  });

  it("only managers resolve reports", async () => {
    expect((await svc.resolveReportAction(eddy, "fake-report-1")).success).toBe(false);
    expect((await svc.resolveReportAction(ownerA, "fake-report-1")).success).toBe(false);
    expect((await svc.resolveReportAction(managerA, "fake-report-1")).success).toBe(true);
    const [group] = await svc.propertiesBoard(ownerA);
    expect(group.counts.Flagged).toBe(0);
  });

  it("report listing respects job visibility", async () => {
    expect((await svc.listReportsForViewer(eddy, "fake-job-5")).length).toBe(1);
    expect((await svc.listReportsForViewer(sam, "fake-job-5")).length).toBe(0);
    expect((await svc.listReportsForViewer(ownerB, "fake-job-5")).length).toBe(0);
  });

  it("photo upload is authorized per job", async () => {
    const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
    expect((await svc.uploadReportPhoto(lydia, "fake-job-4", file)).success).toBe(false);
    expect((await svc.uploadReportPhoto(eddy, "fake-job-4", file)).success).toBe(true);
    const big = new File([new Uint8Array(9 * 1024 * 1024)], "b.jpg", { type: "image/jpeg" });
    expect((await svc.uploadReportPhoto(eddy, "fake-job-4", big)).success).toBe(false);
    const exe = new File([new Uint8Array(10)], "c.exe", { type: "application/x-msdownload" });
    expect((await svc.uploadReportPhoto(eddy, "fake-job-4", exe)).success).toBe(false);
  });
});

describe("manual jobs", () => {
  const tomorrow = addDays(todayInEdmonton(), 1);
  const input = (over = {}) => ({ unitId: "fake-unit-a6", date: tomorrow, idempotencyKey: "key-aaaaaaaa", ...over });

  it("owners schedule on their own units; price comes from the unit's rate", async () => {
    const r = await svc.createManualJob(ownerA, input());
    expect(r.success).toBe(true);
    const created = repo.state.jobs.find((j) => j.source === "owner_manual");
    expect(created?.price).toBe(120);
    expect(created?.status).toBe("Upcoming");
    expect(created?.specialRequest).toBeNull();
  });

  it("rejects other owners, cleaners and unknown units", async () => {
    expect((await svc.createManualJob(ownerB, input())).success).toBe(false);
    expect((await svc.createManualJob(eddy, input())).success).toBe(false);
    expect((await svc.createManualJob(ownerA, input({ unitId: "fake-unit-b1" }))).success).toBe(false);
    expect((await svc.createManualJob(ownerA, input({ unitId: "nope" }))).success).toBe(false);
    expect(repo.state.jobs.some((j) => j.source === "owner_manual")).toBe(false);
  });

  it("double-submit and same-day duplicates create one job", async () => {
    await svc.createManualJob(ownerA, input());
    const replay = await svc.createManualJob(ownerA, input()); // same idempotency key
    expect(replay.success).toBe(true);
    const dup = await svc.createManualJob(ownerA, input({ idempotencyKey: "key-bbbbbbbb" }));
    expect(dup.success).toBe(false);
    expect(repo.state.jobs.filter((j) => j.source === "owner_manual").length).toBe(1);
  });

  it("validates date, time, key and trims the special request", async () => {
    expect((await svc.createManualJob(ownerA, input({ date: addDays(todayInEdmonton(), -1) }))).success).toBe(false);
    expect((await svc.createManualJob(ownerA, input({ date: "garbage" }))).success).toBe(false);
    expect((await svc.createManualJob(ownerA, input({ time: "99:99" }))).success).toBe(false);
    expect((await svc.createManualJob(ownerA, input({ idempotencyKey: "x" }))).success).toBe(false);
    const ok = await svc.createManualJob(ownerA, input({ specialRequest: "  Extra towels  " }));
    expect(ok.success).toBe(true);
    expect(repo.state.jobs.find((j) => j.source === "owner_manual")?.specialRequest).toBe("Extra towels");
  });

  it("managers can schedule too", async () => {
    expect((await svc.createManualJob(managerA, input())).success).toBe(true);
  });
});

describe("unit editing", () => {
  it("owner/manager of the building only", async () => {
    expect((await svc.updateUnitDetails(ownerA, "fake-unit-a1", { importantNotes: "Extra towels" })).success).toBe(true);
    expect((await svc.updateUnitDetails(managerA, "fake-unit-a1", { accessInstructions: "Code 1234" })).success).toBe(true);
    expect((await svc.updateUnitDetails(ownerB, "fake-unit-a1", { importantNotes: "x" })).success).toBe(false);
    expect((await svc.updateUnitDetails(eddy, "fake-unit-a1", { importantNotes: "x" })).success).toBe(false);
    expect(repo.state.units.find((u) => u.id === "fake-unit-a1")?.importantNotes).toBe("Extra towels");
  });

  it("validates checklists and ignores unlisted fields", async () => {
    expect((await svc.updateUnitDetails(ownerA, "fake-unit-a1", { checklistItems: [{ id: "BAD ID", title: "t" }] })).success).toBe(false);
    expect((await svc.updateUnitDetails(ownerA, "fake-unit-a1", { checklistItems: [{ id: "ok", title: "Do it" }] })).success).toBe(true);
    expect(repo.state.units.find((u) => u.id === "fake-unit-a1")?.checklistItems).toEqual([{ id: "ok", title: "Do it" }]);
    const sneaky = { importantNotes: "n", standardRate: 1, buildingId: B } as never;
    await svc.updateUnitDetails(ownerA, "fake-unit-a1", sneaky);
    const u = repo.state.units.find((x) => x.id === "fake-unit-a1");
    expect(u?.standardRate).toBe(120);
    expect(u?.buildingId).toBe(A);
  });
});

describe("pricing", () => {
  it("only a manager with price permission (or admin) can change prices, with history", async () => {
    expect((await svc.setJobPrice(ownerA, "fake-job-1", 150, null)).success).toBe(false);
    expect((await svc.setJobPrice(managerNoPrice, "fake-job-1", 150, null)).success).toBe(false);
    expect((await svc.setJobPrice(eddy, "fake-job-1", 150, null)).success).toBe(false);
    expect((await svc.setJobPrice(managerA, "fake-job-b1", 150, null)).success).toBe(false); // other building
    expect((await svc.setJobPrice(managerA, "fake-job-1", -5, null)).success).toBe(false);
    expect((await svc.setJobPrice(managerA, "fake-job-1", "abc", null)).success).toBe(false);
    expect((await svc.setJobPrice(managerA, "fake-job-1", 150, "Heavy clean")).success).toBe(true);
    expect((await repo.getJob("fake-job-1"))?.price).toBe(150);
    const hist = await svc.getPriceHistory(managerA, "fake-job-1");
    expect(hist[0]).toMatchObject({ oldPrice: 120, newPrice: 150, reason: "Heavy clean" });
    expect((await svc.setJobPrice(admin, "fake-job-b1", 99, null)).success).toBe(true);
  });

  it("an owner who is also a priced manager can edit, a plain owner cannot", async () => {
    const both = sess("both", { grants: [grant("owner", A), grant("manager", A, { canEditPrice: true })] });
    expect((await svc.setJobPrice(both, "fake-job-1", 130, null)).success).toBe(true);
    expect((await svc.getPriceHistory(ownerA, "fake-job-1")).length).toBe(0);
  });
});

describe("team management", () => {
  const person = { name: "Pat", phone: "(403) 555-0147" };

  it("LCP-managed owners cannot change staffing", async () => {
    expect((await svc.addCleanerToBuilding(ownerA, A, person)).success).toBe(false);
    expect((await svc.removeCleanerFromBuilding(ownerA, A, FAKE_STAFF_ID)).success).toBe(false);
    expect((await svc.assignBuildingManager(ownerA, A, { ...person, canEditPrice: true, isPrimary: false })).success).toBe(false);
    expect(repo.state.cleaners.length).toBe(3);
  });

  it("self-managed owners control their own team only", async () => {
    expect((await svc.addCleanerToBuilding(ownerB, B, person)).success).toBe(true);
    expect(repo.state.cleaners.some((c) => c.buildingId === B && c.name === "Pat")).toBe(true);
    expect((await svc.addCleanerToBuilding(ownerB, A, person)).success).toBe(false);
    expect((await svc.removeCleanerFromBuilding(ownerB, A, FAKE_STAFF_ID)).success).toBe(false);
    expect((await svc.assignBuildingManager(ownerB, B, { ...person, canEditPrice: false, isPrimary: true })).success).toBe(true);
    expect(repo.state.managers.find((m) => m.buildingId === B)?.isPrimary).toBe(true);
    expect((await svc.removeCleanerFromBuilding(ownerB, B, FAKE_STAFF_3)).success).toBe(true);
  });

  it("validates phone and name; cleaners and managers cannot manage teams", async () => {
    expect((await svc.addCleanerToBuilding(ownerB, B, { name: "Pat", phone: "123" })).success).toBe(false);
    expect((await svc.addCleanerToBuilding(ownerB, B, { name: " ", phone: person.phone })).success).toBe(false);
    expect((await svc.addCleanerToBuilding(sam, B, person)).success).toBe(false);
    expect((await svc.addCleanerToBuilding(managerA, A, person)).success).toBe(false);
  });

  it("admin can manage any building; only one primary manager per building", async () => {
    expect((await svc.addCleanerToBuilding(admin, A, person)).success).toBe(true);
    await svc.assignBuildingManager(admin, A, { name: "Kim", phone: "403-555-0188", canEditPrice: true, isPrimary: true });
    expect(repo.state.managers.filter((m) => m.buildingId === A && m.isPrimary).length).toBe(1);
  });

  it("team view lists only managed buildings and flags editability", async () => {
    const a = await svc.getTeam(ownerA);
    expect(a.map((g) => g.building.id)).toEqual([A]);
    expect(a[0].canEdit).toBe(false);
    const b = await svc.getTeam(ownerB);
    expect(b[0].canEdit).toBe(true);
    expect(await svc.getTeam(eddy)).toEqual([]);
  });
});
