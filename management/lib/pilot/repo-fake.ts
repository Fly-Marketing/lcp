import { randomUUID } from "crypto";
import { DEFAULT_CHECKLIST_ITEMS } from "@/lib/pilot/types";
import type {
  BuildingRow,
  CleanerRow,
  CreateJobResult,
  JobQuery,
  JobRow,
  ManagerRow,
  NewReport,
  PilotRepo,
  PriceHistoryRow,
  ReportRow,
  UnitPatch,
  UnitRow,
} from "@/lib/pilot/repo";
import { FAKE_BUILDING_A, FAKE_BUILDING_B, FAKE_STAFF_ID } from "@/lib/auth/fake-session";
import { todayInEdmonton } from "@/lib/pilot/validation";

// In-memory repo. Used for PILOT_USE_FAKE_DATA=true (local UI work) and by unit tests.
// State resets on server restart — that's intentional.

const DAY = 24 * 60 * 60 * 1000;
const iso = (d: Date) => d.toISOString();
const dateOnly = (offsetDays: number, base = new Date()) =>
  iso(new Date(base.getTime() + offsetDays * DAY)).slice(0, 10);

export const FAKE_STAFF_2 = "fake-staff-2"; // another cleaner at building A
export const FAKE_STAFF_3 = "fake-staff-3"; // cleaner at building B only

export interface FakeState {
  buildings: BuildingRow[];
  units: UnitRow[];
  jobs: JobRow[];
  reports: ReportRow[];
  cleaners: CleanerRow[];
  managers: ManagerRow[];
  staffNames: Record<string, string>;
  priceHistory: Record<string, PriceHistoryRow[]>;
  idempotency: Record<string, string>;
  people: { accountId: string; staffId: string | null; name: string; phone: string }[];
}

function unit(id: string, buildingId: string, name: string, address: string, extra: Partial<UnitRow> = {}): UnitRow {
  return {
    id,
    buildingId,
    name,
    address,
    accessInstructions: null,
    importantNotes: null,
    specialRequirements: null,
    checklistItems: null,
    standardRate: buildingId === FAKE_BUILDING_A ? 120 : 90,
    expectedHours: 2,
    checkoutTime: "11:00",
    active: true,
    ...extra,
  };
}

function job(id: string, u: UnitRow, extra: Partial<JobRow>): JobRow {
  return {
    id,
    unitId: u.id,
    buildingId: u.buildingId,
    checkoutDate: dateOnly(0),
    checkoutTime: "11:00",
    nextCheckInDate: null,
    latestCleanDate: null,
    expectedHours: 2,
    status: "Upcoming",
    claimedAt: null,
    completedAt: null,
    cancelledAt: null,
    assignedStaffId: null,
    assignedStaffName: null,
    specialRequest: null,
    price: u.standardRate,
    source: "Airbnb",
    createdAt: iso(new Date()),
    ...extra,
  };
}

export function fakeFixtures(now = new Date()): FakeState {
  const addrA = "10608 106 St Edmonton, AB T5H 2X8";
  const addrB = "55 Garden Rd Calgary, AB T2P 1A1";
  const a1 = unit("fake-unit-a1", FAKE_BUILDING_A, "Suite 1", addrA, { accessInstructions: "Front desk has a spare key, ask for Suite 1." });
  const a2 = unit("fake-unit-a2", FAKE_BUILDING_A, "Suite 2", addrA, { accessInstructions: "Smart lock, code 8842#." });
  const a3 = unit("fake-unit-a3", FAKE_BUILDING_A, "Suite 3B", addrA, {
    accessInstructions: "Lockbox code 4471. Key is on the hook inside the pantry door.",
    importantNotes: "Same-day turnover — guest checks in at 4pm, clean this first.",
    specialRequirements: "Pet-friendly unit, vacuum under the couch.",
    checklistItems: [
      { id: "hot_tub", title: "Check hot tub chemicals", description: "Test pH and chlorine levels" },
      { id: "trash", title: "Trash out", description: "All trash and recycling removed" },
      { id: "linens", title: "Linens changed", description: "Fresh sheets and towels" },
      { id: "walkthrough", title: "Final walkthrough", description: "Nothing left behind, doors locked" },
    ],
  });
  const a4 = unit("fake-unit-a4", FAKE_BUILDING_A, "Suite 4", addrA, { accessInstructions: "Lockbox code 4471." });
  const a5 = unit("fake-unit-a5", FAKE_BUILDING_A, "Suite 5", addrA, { accessInstructions: "Smart lock, code 8842#." });
  const a6 = unit("fake-unit-a6", FAKE_BUILDING_A, "Suite 6", addrA);
  const b1 = unit("fake-unit-b1", FAKE_BUILDING_B, "Unit 101", addrB, { accessInstructions: "Keypad 2290." });
  const b2 = unit("fake-unit-b2", FAKE_BUILDING_B, "Unit 102", addrB);

  const completedAt = (daysAgo: number) => iso(new Date(now.getTime() - daysAgo * DAY));

  const jobs: JobRow[] = [
    job("fake-job-1", a3, { checkoutDate: dateOnly(0, now), nextCheckInDate: dateOnly(0, now) }),
    job("fake-job-2", a5, { checkoutDate: dateOnly(0, now), nextCheckInDate: dateOnly(3, now) }),
    job("fake-job-3", a1, { checkoutDate: dateOnly(2, now), nextCheckInDate: dateOnly(4, now) }),
    job("fake-job-4", a4, {
      checkoutDate: dateOnly(-2, now),
      nextCheckInDate: dateOnly(-2, now),
      status: "Completed",
      assignedStaffId: FAKE_STAFF_ID,
      assignedStaffName: "Eddy (fake)",
      claimedAt: completedAt(3),
      completedAt: completedAt(2),
    }),
    job("fake-job-5", a2, {
      checkoutDate: dateOnly(-5, now),
      nextCheckInDate: dateOnly(-5, now),
      status: "Completed",
      assignedStaffId: FAKE_STAFF_ID,
      assignedStaffName: "Eddy (fake)",
      claimedAt: completedAt(6),
      completedAt: completedAt(5),
    }),
    job("fake-job-6", a6, { checkoutDate: dateOnly(0, now), nextCheckInDate: dateOnly(1, now) }),
    // Another cleaner's claimed job at building A (must stay hidden from other cleaners).
    job("fake-job-7", a2, {
      checkoutDate: dateOnly(1, now),
      status: "Claimed",
      assignedStaffId: FAKE_STAFF_2,
      assignedStaffName: "Lydia (fake)",
      claimedAt: completedAt(0),
      specialRequest: "Owner's cat is in the unit — keep the bedroom door closed.",
    }),
    // Building B (self-managed, different owner).
    job("fake-job-b1", b1, { checkoutDate: dateOnly(1, now) }),
    job("fake-job-b2", b2, {
      checkoutDate: dateOnly(2, now),
      status: "Claimed",
      assignedStaffId: FAKE_STAFF_3,
      assignedStaffName: "Sam (fake)",
      claimedAt: completedAt(0),
    }),
  ];

  const reports: ReportRow[] = [
    {
      id: "fake-report-1",
      jobId: "fake-job-5",
      unitId: a2.id,
      buildingId: FAKE_BUILDING_A,
      staffId: FAKE_STAFF_ID,
      category: "Maintenance Issue",
      description: "Bathroom faucet is dripping, needs a plumber.",
      urgent: false,
      photoPaths: [],
      status: "New",
      createdAt: completedAt(5),
      resolvedAt: null,
    },
  ];

  return {
    buildings: [
      {
        id: FAKE_BUILDING_A,
        name: "Macewan B&B (fake)",
        address: addrA,
        managementMode: "lcp",
        customerId: "fake-customer-1",
        customerName: "Caitlyn (fake)",
        customerMobile: "7805550123",
      },
      {
        id: FAKE_BUILDING_B,
        name: "Garden Suites (fake)",
        address: addrB,
        managementMode: "self",
        customerId: "fake-customer-2",
        customerName: "Dana (fake)",
        customerMobile: "4035550199",
      },
    ],
    units: [a1, a2, a3, a4, a5, a6, b1, b2],
    jobs,
    reports,
    cleaners: [
      { buildingId: FAKE_BUILDING_A, staffId: FAKE_STAFF_ID, accountId: "fake-account", name: "Eddy (fake)", mobile: "7805551234", role: "primary" },
      { buildingId: FAKE_BUILDING_A, staffId: FAKE_STAFF_2, accountId: "fake-account-2", name: "Lydia (fake)", mobile: "7805559999", role: "backup" },
      { buildingId: FAKE_BUILDING_B, staffId: FAKE_STAFF_3, accountId: "fake-account-3", name: "Sam (fake)", mobile: "4035550000", role: "primary" },
    ],
    managers: [
      {
        buildingId: FAKE_BUILDING_A,
        accountId: "fake-manager-account",
        name: "Morgan (fake)",
        phone: "+17805550111",
        canEditPrice: true,
        isPrimary: true,
      },
    ],
    staffNames: { [FAKE_STAFF_ID]: "Eddy (fake)", [FAKE_STAFF_2]: "Lydia (fake)", [FAKE_STAFF_3]: "Sam (fake)" },
    priceHistory: {},
    idempotency: {},
    people: [],
  };
}

const ACCEPTABLE = ["Open", "Upcoming", "Ready"];

export function createFakeRepo(state: FakeState = fakeFixtures()): PilotRepo & { state: FakeState } {
  const withNames = (j: JobRow): JobRow => ({
    ...j,
    assignedStaffName: j.assignedStaffId ? (state.staffNames[j.assignedStaffId] ?? j.assignedStaffName) : null,
  });
  const findJob = (id: string) => state.jobs.find((j) => j.id === id);

  return {
    state,

    async listBuildings(ids) {
      return state.buildings.filter((b) => ids.includes(b.id)).map((b) => ({ ...b }));
    },
    async listUnits(buildingIds) {
      return state.units.filter((u) => u.buildingId && buildingIds.includes(u.buildingId)).map((u) => ({ ...u }));
    },
    async getUnit(id) {
      const u = state.units.find((x) => x.id === id);
      return u ? { ...u } : null;
    },
    async updateUnit(id, patch: UnitPatch) {
      const u = state.units.find((x) => x.id === id);
      if (!u) return;
      if ("accessInstructions" in patch) u.accessInstructions = patch.accessInstructions ?? null;
      if ("importantNotes" in patch) u.importantNotes = patch.importantNotes ?? null;
      if ("specialRequirements" in patch) u.specialRequirements = patch.specialRequirements ?? null;
      if ("checklistItems" in patch) u.checklistItems = patch.checklistItems ?? null;
    },

    async listJobs(q: JobQuery) {
      let rows = state.jobs.filter((j) => j.buildingId && q.buildingIds.includes(j.buildingId));
      if (!q.includeCancelled) rows = rows.filter((j) => !j.cancelledAt);
      if (q.statuses) rows = rows.filter((j) => q.statuses!.includes(j.status));
      if (q.assignedStaffId) rows = rows.filter((j) => j.assignedStaffId === q.assignedStaffId);
      if (q.unassignedOnly) rows = rows.filter((j) => !j.assignedStaffId);
      if (q.onlyOpen) rows = rows.filter((j) => !j.completedAt && !j.cancelledAt);
      if (q.onlyCompleted) rows = rows.filter((j) => !!j.completedAt);
      if (q.claimedOrCompleted) rows = rows.filter((j) => !!j.claimedAt || !!j.completedAt);
      if (q.checkoutFrom) rows = rows.filter((j) => (j.checkoutDate ?? "") >= q.checkoutFrom!);
      const cmp: Record<JobQuery["orderBy"], (a: JobRow, b: JobRow) => number> = {
        checkout_asc: (a, b) => (a.checkoutDate ?? "").localeCompare(b.checkoutDate ?? ""),
        checkout_desc: (a, b) => (b.checkoutDate ?? "").localeCompare(a.checkoutDate ?? ""),
        completed_desc: (a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
      };
      rows = [...rows].sort(cmp[q.orderBy]);
      if (q.limit) rows = rows.slice(0, q.limit);
      return rows.map(withNames);
    },
    async getJob(id) {
      const j = findJob(id);
      return j ? withNames(j) : null;
    },
    async claimJob(jobId, staffId) {
      const j = findJob(jobId);
      if (!j || j.assignedStaffId || j.cancelledAt || !ACCEPTABLE.includes(j.status)) return false;
      j.status = "Claimed";
      j.claimedAt = iso(new Date());
      j.assignedStaffId = staffId;
      return true;
    },
    async completeJob(jobId, staffId) {
      const j = findJob(jobId);
      if (!j || j.assignedStaffId !== staffId || j.completedAt || j.cancelledAt) return false;
      j.status = "Completed";
      j.completedAt = iso(new Date());
      return true;
    },
    async setJobResult(jobId, state2) {
      const j = findJob(jobId);
      if (!j || !j.completedAt) return false;
      j.status = state2;
      return true;
    },
    async createOwnerJob(input): Promise<CreateJobResult> {
      const replay = state.idempotency[input.idempotencyKey];
      if (replay) return { jobId: replay, status: "replayed" };
      const u = state.units.find((x) => x.id === input.unitId && x.active);
      if (!u) throw new Error("unit_not_found");
      const dup = state.jobs.find(
        (j) => j.unitId === u.id && j.checkoutDate === input.date && j.source === "owner_manual" && !j.cancelledAt
      );
      if (dup) return { jobId: dup.id, status: "duplicate" };
      const today = todayInEdmonton();
      const id = randomUUID();
      state.jobs.push(
        job(id, u, {
          checkoutDate: input.date,
          checkoutTime: input.time || u.checkoutTime,
          status: input.date <= today ? "Ready" : "Upcoming",
          specialRequest: input.specialRequest,
          source: "owner_manual",
        })
      );
      state.idempotency[input.idempotencyKey] = id;
      return { jobId: id, status: "created" };
    },
    async updateJobPrice(jobId, price, accountId, reason) {
      const j = findJob(jobId);
      if (!j) throw new Error("job_not_found");
      (state.priceHistory[jobId] ??= []).unshift({
        oldPrice: j.price,
        newPrice: price,
        reason,
        changedAt: iso(new Date()),
        changedByName: accountId,
      });
      j.price = price;
    },
    async listPriceHistory(jobId) {
      return [...(state.priceHistory[jobId] ?? [])];
    },

    async listReportsForJobs(jobIds) {
      return state.reports
        .filter((r) => jobIds.includes(r.jobId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((r) => ({ ...r, photoPaths: [...r.photoPaths] }));
    },
    async listReportsForBuildings(buildingIds, openOnly) {
      return state.reports
        .filter((r) => r.buildingId && buildingIds.includes(r.buildingId) && (!openOnly || !r.resolvedAt))
        .map((r) => ({ ...r, photoPaths: [...r.photoPaths] }));
    },
    async getReport(id) {
      const r = state.reports.find((x) => x.id === id);
      return r ? { ...r, photoPaths: [...r.photoPaths] } : null;
    },
    async insertReport(r: NewReport) {
      const j = findJob(r.jobId);
      state.reports.unshift({
        id: `fake-report-${randomUUID()}`,
        jobId: r.jobId,
        unitId: j?.unitId ?? null,
        buildingId: j?.buildingId ?? null,
        staffId: r.staffId,
        category: r.category,
        description: r.description,
        urgent: r.urgent,
        photoPaths: r.photoPaths,
        status: "New",
        createdAt: iso(new Date()),
        resolvedAt: null,
      });
    },
    async updateReport(id, patch) {
      const r = state.reports.find((x) => x.id === id);
      if (!r) return;
      r.category = patch.category;
      r.description = patch.description;
      r.urgent = patch.urgent;
      r.photoPaths = patch.photoPaths;
    },
    async deleteReport(id) {
      state.reports = state.reports.filter((r) => r.id !== id);
    },
    async resolveReport(id) {
      const r = state.reports.find((x) => x.id === id);
      if (r) {
        r.resolvedAt = iso(new Date());
        r.status = "Resolved";
      }
    },

    async uploadPhoto(jobId) {
      return { path: `fake/${jobId}/${Date.now()}.jpg` };
    },
    async signedPhotoUrl(p) {
      return p.startsWith("http") ? p : `https://example.com/${p}`;
    },

    async listCleaners(buildingIds) {
      return state.cleaners.filter((c) => buildingIds.includes(c.buildingId)).map((c) => ({ ...c }));
    },
    async listManagers(buildingIds) {
      return state.managers.filter((m) => buildingIds.includes(m.buildingId)).map((m) => ({ ...m }));
    },
    async ensurePerson({ name, phoneE164, asCleaner }) {
      let p = state.people.find((x) => x.phone === phoneE164);
      if (!p) {
        p = { accountId: `fake-acc-${randomUUID()}`, staffId: null, name, phone: phoneE164 };
        state.people.push(p);
      }
      if (asCleaner && !p.staffId) {
        p.staffId = `fake-staff-${randomUUID()}`;
        state.staffNames[p.staffId] = name;
      }
      return { accountId: p.accountId, staffId: p.staffId };
    },
    async addCleaner(buildingId, staffId, role) {
      if (state.cleaners.some((c) => c.buildingId === buildingId && c.staffId === staffId)) return;
      const person = state.people.find((p) => p.staffId === staffId);
      state.cleaners.push({
        buildingId,
        staffId,
        accountId: person?.accountId ?? null,
        name: state.staffNames[staffId] ?? "Cleaner",
        mobile: person?.phone ?? null,
        role,
      });
    },
    async removeCleaner(buildingId, staffId) {
      state.cleaners = state.cleaners.filter((c) => !(c.buildingId === buildingId && c.staffId === staffId));
    },
    async setManager(buildingId, accountId, opts) {
      if (opts.isPrimary) {
        for (const m of state.managers) if (m.buildingId === buildingId) m.isPrimary = false;
      }
      const existing = state.managers.find((m) => m.buildingId === buildingId && m.accountId === accountId);
      if (existing) {
        existing.canEditPrice = opts.canEditPrice;
        existing.isPrimary = opts.isPrimary;
        return;
      }
      const person = state.people.find((p) => p.accountId === accountId);
      state.managers.push({
        buildingId,
        accountId,
        name: person?.name ?? "Manager",
        phone: person?.phone ?? "",
        canEditPrice: opts.canEditPrice,
        isPrimary: opts.isPrimary,
      });
    },
    async removeManager(buildingId, accountId) {
      state.managers = state.managers.filter((m) => !(m.buildingId === buildingId && m.accountId === accountId));
    },
  };
}

// Dev singleton, kept on globalThis so hot reloads don't reset state mid-session.
const g = globalThis as unknown as { __lcpFakeRepo?: ReturnType<typeof createFakeRepo> };
export function getFakeRepo() {
  return (g.__lcpFakeRepo ??= createFakeRepo());
}

export { DEFAULT_CHECKLIST_ITEMS };
