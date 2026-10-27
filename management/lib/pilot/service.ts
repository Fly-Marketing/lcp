import "server-only";
import { buildingIdsFor, can, grantsAt, hasRole } from "@/lib/auth/permissions";
import { normalizePhone } from "@/lib/auth/phone";
import type { Session } from "@/lib/auth/types";
import { getRepo } from "@/lib/pilot/repo-select";
import type { BuildingRow, JobRow, ReportRow, UnitRow } from "@/lib/pilot/repo";
import { firstName, ownerStatus, unitStatus, type UnitStatus } from "@/lib/pilot/status";
import {
  DEFAULT_CHECKLIST_ITEMS,
  ISSUE_CATEGORIES,
  type IssueCategory,
  type PilotJob,
  type PilotReport,
} from "@/lib/pilot/types";
import {
  addDays,
  cleanText,
  todayInEdmonton,
  validateChecklist,
  validateJobDate,
  validatePrice,
  validateTime,
} from "@/lib/pilot/validation";

// Every exported function here takes the caller's Session and authorizes the
// specific building/job BEFORE touching data. Denials are deliberately generic.

export type Ok<T = undefined> = { success: true } & (T extends undefined ? object : { data: T });
export type Fail = { success: false; message: string };
const DENIED: Fail = { success: false, message: "You don't have access to that" };
const fail = (message: string): Fail => ({ success: false, message });

const jobCtx = (j: JobRow) => ({
  assignedStaffId: j.assignedStaffId,
  status: j.status,
  cancelled: !!j.cancelledAt,
});

// ---------- mapping ----------

function canSeePrice(session: Session, buildingId: string | null): boolean {
  if (!buildingId) return false;
  return session.isAdmin || grantsAt(session, buildingId, ["owner", "manager"]).length > 0;
}

function toPilotJob(
  session: Session,
  job: JobRow,
  unit: UnitRow | undefined,
  building: BuildingRow | undefined
): PilotJob {
  const staffView = canSeePrice(session, job.buildingId); // owner / manager / admin viewer
  return {
    id: job.id,
    unitId: job.unitId,
    buildingId: job.buildingId,
    unitLabel: unit?.name ?? "Unknown unit",
    propertyName: building?.name ?? "Unknown property",
    address: unit?.address ?? building?.address ?? "",
    checkoutDate: job.checkoutDate,
    checkoutTime: job.checkoutTime,
    nextCheckInDate: job.nextCheckInDate,
    expectedHours: Number(job.expectedHours ?? 0),
    status: job.status,
    accessInstructions: unit?.accessInstructions ?? null,
    importantNotes: unit?.importantNotes ?? null,
    specialRequirements: unit?.specialRequirements ?? null,
    specialRequest: job.specialRequest,
    claimedAt: job.claimedAt,
    completedAt: job.completedAt,
    cancelledAt: job.cancelledAt,
    assignedStaffId: job.assignedStaffId,
    // Customer price: owners/managers only. Cleaner pay is never part of this payload.
    price: staffView ? job.price : null,
    assignedCleanerName: staffView ? firstName(job.assignedStaffName) : null,
    source: job.source,
    // Cleaners can call/text the owner; staff views don't need it.
    ownerName: staffView ? null : (building?.customerName ?? null),
    ownerMobile: staffView ? null : (building?.customerMobile ?? null),
    checklistItems:
      unit?.checklistItems && unit.checklistItems.length > 0 ? unit.checklistItems : DEFAULT_CHECKLIST_ITEMS,
  };
}

async function hydrate(session: Session, jobs: JobRow[]): Promise<PilotJob[]> {
  if (jobs.length === 0) return [];
  const repo = getRepo();
  const buildingIds = [...new Set(jobs.map((j) => j.buildingId).filter((x): x is string => !!x))];
  const [units, buildings] = await Promise.all([repo.listUnits(buildingIds), repo.listBuildings(buildingIds)]);
  const unitById = new Map(units.map((u) => [u.id, u]));
  const buildingById = new Map(buildings.map((b) => [b.id, b]));
  return jobs.map((j) =>
    toPilotJob(session, j, j.unitId ? unitById.get(j.unitId) : undefined, j.buildingId ? buildingById.get(j.buildingId) : undefined)
  );
}

// ---------- cleaner reads ----------

// Unclaimed work at the cleaner's buildings (the "opportunities" list).
export async function listOpenJobsForCleaner(session: Session): Promise<PilotJob[]> {
  const buildingIds = buildingIdsFor(session, ["cleaner"]);
  if (buildingIds.length === 0 || !session.staffId) return [];
  const jobs = await getRepo().listJobs({
    buildingIds,
    statuses: ["Open", "Upcoming", "Ready"],
    unassignedOnly: true,
    onlyOpen: true,
    orderBy: "checkout_asc",
  });
  return hydrate(session, jobs);
}

// Jobs this person accepted (current + completed). Never other cleaners' jobs.
export async function listMyJobs(session: Session): Promise<PilotJob[]> {
  const buildingIds = buildingIdsFor(session, ["cleaner"]);
  if (buildingIds.length === 0 || !session.staffId) return [];
  const jobs = await getRepo().listJobs({
    buildingIds,
    assignedStaffId: session.staffId,
    claimedOrCompleted: true,
    orderBy: "checkout_desc",
    limit: 50,
  });
  // In-progress first, then finished.
  jobs.sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt));
  return hydrate(session, jobs);
}

// One job, only if the caller may view it.
export async function getJobForViewer(session: Session, jobId: string): Promise<PilotJob | null> {
  const job = await getRepo().getJob(jobId);
  if (!job || !job.buildingId) return null;
  if (!can(session, "job.view", { buildingId: job.buildingId, job: jobCtx(job) })) return null;
  const [pj] = await hydrate(session, [job]);
  return pj ?? null;
}

export async function listReportsForViewer(session: Session, jobId: string): Promise<PilotReport[]> {
  const repo = getRepo();
  const job = await repo.getJob(jobId);
  if (!job?.buildingId) return [];
  if (!can(session, "report.view", { buildingId: job.buildingId, job: jobCtx(job) })) return [];
  return mapReports(await repo.listReportsForJobs([jobId]));
}

async function mapReports(rows: ReportRow[]): Promise<PilotReport[]> {
  const repo = getRepo();
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      jobId: r.jobId,
      staffId: r.staffId,
      category: r.category,
      description: r.description,
      urgent: r.urgent,
      photoUrls: (await Promise.all(r.photoPaths.map((p) => repo.signedPhotoUrl(p)))).filter((u): u is string => !!u),
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
    }))
  );
}

// ---------- cleaner mutations ----------

export async function acceptJob(session: Session, jobId: string): Promise<Ok | Fail> {
  const repo = getRepo();
  const job = await repo.getJob(jobId);
  if (!job?.buildingId || !session.staffId) return DENIED;
  if (!can(session, "job.accept", { buildingId: job.buildingId, job: jobCtx(job) })) {
    return fail("This job is no longer available");
  }
  // The DB re-checks atomically, so two cleaners can't both win.
  const won = await repo.claimJob(jobId, session.staffId);
  return won ? { success: true } : fail("This job is no longer available");
}

export async function completeJob(session: Session, jobId: string): Promise<Ok | Fail> {
  const repo = getRepo();
  const job = await repo.getJob(jobId);
  if (!job?.buildingId || !session.staffId) return DENIED;
  if (!can(session, "job.complete", { buildingId: job.buildingId, job: jobCtx(job) })) return DENIED;
  const done = await repo.completeJob(jobId, session.staffId);
  return done ? { success: true } : fail("This job can't be marked complete");
}

export async function setCompletedJobResult(session: Session, jobId: string, state: string): Promise<Ok | Fail> {
  if (!["Completed", "Needs attention", "Not clean"].includes(state)) return fail("Choose a valid cleaning result");
  const repo = getRepo();
  const job = await repo.getJob(jobId);
  if (!job?.buildingId) return DENIED;
  if (!can(session, "job.updateResult", { buildingId: job.buildingId, job: jobCtx(job) })) return DENIED;
  const ok = await repo.setJobResult(jobId, state);
  return ok ? { success: true } : fail("That clean hasn't been completed yet");
}

// ---------- reports ----------

export interface ReportInput {
  description: string;
  category: IssueCategory;
  urgent: boolean;
  photoPaths: string[];
}

function validateReportInput(jobId: string, input: ReportInput): Fail | null {
  const description = (input.description ?? "").trim();
  if (!description) return fail("Describe the issue before saving");
  if (description.length > 2000) return fail("Please keep the description under 2000 characters");
  if (!ISSUE_CATEGORIES.includes(input.category)) return fail("Choose a valid category");
  if (!Array.isArray(input.photoPaths) || input.photoPaths.length > 10) return fail("You can attach up to 10 photos");
  // Photos must have been uploaded for THIS job (stops referencing someone else's files).
  const ok = input.photoPaths.every(
    (p) => typeof p === "string" && (p.startsWith(`${jobId}/`) || p.startsWith(`fake/${jobId}/`))
  );
  if (!ok) return fail("One of the photos isn't valid");
  return null;
}

export async function createReport(session: Session, jobId: string, input: ReportInput): Promise<Ok | Fail> {
  const repo = getRepo();
  const job = await repo.getJob(jobId);
  if (!job?.buildingId) return DENIED;
  if (!can(session, "report.create", { buildingId: job.buildingId, job: jobCtx(job) })) return DENIED;
  const invalid = validateReportInput(jobId, input);
  if (invalid) return invalid;
  await repo.insertReport({
    jobId,
    staffId: session.staffId, // from the session, never from the client
    category: input.category,
    description: input.description.trim(),
    urgent: !!input.urgent,
    photoPaths: input.photoPaths,
  });
  return { success: true };
}

export async function editReport(session: Session, reportId: string, input: ReportInput): Promise<Ok | Fail> {
  const repo = getRepo();
  const report = await repo.getReport(reportId);
  if (!report?.buildingId) return DENIED;
  if (!can(session, "report.edit", { buildingId: report.buildingId, report: { staffId: report.staffId } })) return DENIED;
  const invalid = validateReportInput(report.jobId, input);
  if (invalid) return invalid;
  await repo.updateReport(reportId, {
    category: input.category,
    description: input.description.trim(),
    urgent: !!input.urgent,
    photoPaths: input.photoPaths,
  });
  return { success: true };
}

export async function removeReport(session: Session, reportId: string): Promise<Ok | Fail> {
  const repo = getRepo();
  const report = await repo.getReport(reportId);
  if (!report?.buildingId) return DENIED;
  if (!can(session, "report.delete", { buildingId: report.buildingId, report: { staffId: report.staffId } })) return DENIED;
  await repo.deleteReport(reportId);
  return { success: true };
}

export async function resolveReportAction(session: Session, reportId: string): Promise<Ok | Fail> {
  const repo = getRepo();
  const report = await repo.getReport(reportId);
  if (!report?.buildingId) return DENIED;
  // Managers (and admins) close out reports; the report-author shortcut doesn't apply.
  if (!(session.isAdmin || grantsAt(session, report.buildingId, ["manager"]).length > 0)) return DENIED;
  await repo.resolveReport(reportId);
  return { success: true };
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function uploadReportPhoto(
  session: Session,
  jobId: string,
  file: File
): Promise<Fail | { success: true; data: { path: string; previewUrl: string | null } }> {
  const repo = getRepo();
  const job = await repo.getJob(jobId);
  if (!job?.buildingId) return DENIED;
  if (!can(session, "photo.upload", { buildingId: job.buildingId, job: jobCtx(job) })) return DENIED;
  if (file.size > MAX_PHOTO_BYTES) return fail("Photo is too large (max 8MB)");
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) return fail("Unsupported photo type");
  const { path } = await repo.uploadPhoto(jobId, file);
  return { success: true, data: { path, previewUrl: await repo.signedPhotoUrl(path) } };
}

// ---------- owner / manager reads ----------

function managedBuildingIds(session: Session): string[] {
  return session.isAdmin
    ? buildingIdsFor(session)
    : buildingIdsFor(session, ["owner", "manager"]);
}

export interface PropertyCard {
  unit: UnitRow;
  status: UnitStatus;
  lastCleanDate: string | null;
  nextJob: PilotJob | null;
  openReports: number;
}
export interface PropertyGroup {
  building: BuildingRow;
  cards: PropertyCard[];
  counts: Record<UnitStatus, number>;
  canAddJob: boolean;
  canEditUnits: boolean;
}

export async function propertiesBoard(session: Session): Promise<PropertyGroup[]> {
  const ids = managedBuildingIds(session);
  if (ids.length === 0) return [];
  const repo = getRepo();
  const recentFrom = addDays(todayInEdmonton(), -45);
  const [buildings, units, jobs, openReports] = await Promise.all([
    repo.listBuildings(ids),
    repo.listUnits(ids),
    repo.listJobs({ buildingIds: ids, checkoutFrom: recentFrom, orderBy: "checkout_asc", includeCancelled: true }),
    repo.listReportsForBuildings(ids, true),
  ]);
  const pilotJobs = await hydrate(session, jobs);
  const groups: PropertyGroup[] = [];
  for (const b of buildings) {
    const cards: PropertyCard[] = units
      .filter((u) => u.buildingId === b.id && u.active)
      .map((u) => {
        const ujobs = pilotJobs.filter((j) => j.unitId === u.id);
        const reports = openReports.filter((r) => r.unitId === u.id).length;
        const finished = ujobs
          .filter((j) => j.completedAt)
          .sort((a, c) => (c.completedAt ?? "").localeCompare(a.completedAt ?? ""));
        const next = ujobs
          .filter((j) => !j.completedAt && !j.cancelledAt)
          .sort((a, c) => (a.checkoutDate ?? "").localeCompare(c.checkoutDate ?? ""))[0];
        return {
          unit: u,
          status: unitStatus({ jobs: ujobs, openReports: reports }),
          lastCleanDate: finished[0]?.completedAt?.slice(0, 10) ?? null,
          nextJob: next ?? null,
          openReports: reports,
        };
      });
    const counts: Record<UnitStatus, number> = { Ready: 0, "Needs clean": 0, Flagged: 0 };
    for (const c of cards) counts[c.status]++;
    groups.push({
      building: b,
      cards,
      counts,
      canAddJob: can(session, "job.create", { buildingId: b.id }),
      canEditUnits: can(session, "unit.edit", { buildingId: b.id }),
    });
  }
  return groups;
}

export interface JobsFilter {
  scope: "upcoming" | "history" | "attention";
}

export async function listManagedJobs(session: Session, filter: JobsFilter): Promise<PilotJob[]> {
  const ids = managedBuildingIds(session);
  if (ids.length === 0) return [];
  const repo = getRepo();
  const today = todayInEdmonton();
  if (filter.scope === "history") {
    const rows = await repo.listJobs({
      buildingIds: ids,
      onlyCompleted: true,
      checkoutFrom: addDays(today, -90),
      orderBy: "completed_desc",
      limit: 100,
    });
    return hydrate(session, rows);
  }
  const open = await repo.listJobs({ buildingIds: ids, onlyOpen: true, orderBy: "checkout_asc", limit: 200 });
  if (filter.scope === "upcoming") return hydrate(session, open);

  // attention: managers/admins only.
  if (!session.isAdmin && !hasRole(session, "manager")) return [];
  const mgrIds = session.isAdmin ? ids : buildingIdsFor(session, ["manager"]);
  const [reports] = await Promise.all([repo.listReportsForBuildings(mgrIds, true)]);
  const flaggedJobIds = new Set(reports.map((r) => r.jobId));
  const soon = addDays(today, 2);
  const needs = open.filter(
    (j) =>
      j.buildingId && mgrIds.includes(j.buildingId) &&
      (flaggedJobIds.has(j.id) ||
        !!j.specialRequest ||
        (!j.assignedStaffId && (j.latestCleanDate ?? j.checkoutDate ?? "9999") <= soon))
  );
  return hydrate(session, needs);
}

export interface TeamGroup {
  building: BuildingRow;
  cleaners: { staffId: string; name: string; role: "primary" | "backup" }[];
  managers: { accountId: string; name: string; canEditPrice: boolean; isPrimary: boolean }[];
  canEdit: boolean;
}

export async function getTeam(session: Session): Promise<TeamGroup[]> {
  const ids = managedBuildingIds(session);
  if (ids.length === 0) return [];
  const repo = getRepo();
  const [buildings, cleaners, managers] = await Promise.all([
    repo.listBuildings(ids),
    repo.listCleaners(ids),
    repo.listManagers(ids),
  ]);
  return buildings.map((b) => ({
    building: b,
    cleaners: cleaners
      .filter((c) => c.buildingId === b.id)
      .map((c) => ({ staffId: c.staffId, name: c.name, role: c.role })),
    managers: managers
      .filter((m) => m.buildingId === b.id)
      .map((m) => ({ accountId: m.accountId, name: m.name, canEditPrice: m.canEditPrice, isPrimary: m.isPrimary })),
    canEdit: can(session, "team.edit", { buildingId: b.id }),
  }));
}

export async function getPriceHistory(session: Session, jobId: string) {
  const repo = getRepo();
  const job = await repo.getJob(jobId);
  if (!job?.buildingId) return [];
  if (!can(session, "price.edit", { buildingId: job.buildingId })) return [];
  return repo.listPriceHistory(jobId);
}

export function jobPermissions(session: Session, job: PilotJob) {
  const b = job.buildingId;
  return {
    canEditPrice: !!b && can(session, "price.edit", { buildingId: b }),
    canSetResult: !!b && can(session, "job.updateResult", {
      buildingId: b,
      job: { assignedStaffId: job.assignedStaffId, status: job.status, cancelled: !!job.cancelledAt },
    }),
    ownerStatus: ownerStatus(job),
  };
}

// ---------- owner / manager mutations ----------

export interface ManualJobInput {
  unitId: string;
  date: string;
  time?: string | null;
  specialRequest?: string | null;
  idempotencyKey: string;
}

export async function createManualJob(
  session: Session,
  input: ManualJobInput
): Promise<Fail | { success: true; data: { jobId: string; status: "created" | "duplicate" | "replayed" } }> {
  const repo = getRepo();
  const unit = await repo.getUnit(input.unitId);
  if (!unit?.buildingId || !unit.active) return DENIED;
  if (!can(session, "job.create", { buildingId: unit.buildingId })) return DENIED;

  const dateError = validateJobDate(input.date, todayInEdmonton());
  if (dateError) return fail(dateError);
  const timeError = validateTime(input.time);
  if (timeError) return fail(timeError);
  if (!input.idempotencyKey || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 100) {
    return fail("Please try again");
  }

  const result = await repo.createOwnerJob({
    unitId: unit.id,
    date: input.date,
    time: input.time || null,
    specialRequest: cleanText(input.specialRequest, 500),
    accountId: session.accountId,
    idempotencyKey: input.idempotencyKey,
  });
  if (result.status === "duplicate") {
    return fail("A clean is already scheduled for that unit on that day");
  }
  return { success: true, data: result };
}

export async function updateUnitDetails(
  session: Session,
  unitId: string,
  input: {
    accessInstructions?: string | null;
    importantNotes?: string | null;
    specialRequirements?: string | null;
    checklistItems?: unknown;
  }
): Promise<Ok | Fail> {
  const repo = getRepo();
  const unit = await repo.getUnit(unitId);
  if (!unit?.buildingId) return DENIED;
  if (!can(session, "unit.edit", { buildingId: unit.buildingId })) return DENIED;

  const patch: Parameters<typeof repo.updateUnit>[1] = {};
  if ("accessInstructions" in input) patch.accessInstructions = cleanText(input.accessInstructions, 1000);
  if ("importantNotes" in input) patch.importantNotes = cleanText(input.importantNotes, 1000);
  if ("specialRequirements" in input) patch.specialRequirements = cleanText(input.specialRequirements, 1000);
  if ("checklistItems" in input) {
    if (input.checklistItems === null) {
      patch.checklistItems = null;
    } else {
      const r = validateChecklist(input.checklistItems);
      if (!r.ok) return fail(r.message);
      patch.checklistItems = r.items;
    }
  }
  await repo.updateUnit(unitId, patch);
  return { success: true };
}

export async function setJobPrice(
  session: Session,
  jobId: string,
  rawPrice: unknown,
  reason: string | null
): Promise<Ok | Fail> {
  const repo = getRepo();
  const job = await repo.getJob(jobId);
  if (!job?.buildingId) return DENIED;
  if (!can(session, "price.edit", { buildingId: job.buildingId })) return DENIED;
  const price = validatePrice(rawPrice);
  if (price === null) return fail("Enter a valid price");
  await repo.updateJobPrice(jobId, price, session.accountId, cleanText(reason, 300));
  return { success: true };
}

// ---------- team management ----------

async function requireTeamEdit(session: Session, buildingId: string, action: "team.edit" | "manager.assign") {
  if (!can(session, action, { buildingId })) return false;
  const [b] = await getRepo().listBuildings([buildingId]);
  return !!b;
}

export async function addCleanerToBuilding(
  session: Session,
  buildingId: string,
  input: { name: string; phone: string; role?: "primary" | "backup" }
): Promise<Ok | Fail> {
  if (!(await requireTeamEdit(session, buildingId, "team.edit"))) return DENIED;
  const phone = normalizePhone(input.phone);
  const name = cleanText(input.name, 80);
  if (!phone) return fail("Enter a valid phone number");
  if (!name) return fail("Enter their name");
  const repo = getRepo();
  const person = await repo.ensurePerson({ name, phoneE164: phone, asCleaner: true });
  if (!person.staffId) return fail("Could not add that person");
  await repo.addCleaner(buildingId, person.staffId, input.role === "backup" ? "backup" : "primary");
  return { success: true };
}

export async function removeCleanerFromBuilding(session: Session, buildingId: string, staffId: string): Promise<Ok | Fail> {
  if (!(await requireTeamEdit(session, buildingId, "team.edit"))) return DENIED;
  await getRepo().removeCleaner(buildingId, staffId);
  return { success: true };
}

export async function assignBuildingManager(
  session: Session,
  buildingId: string,
  input: { name: string; phone: string; canEditPrice: boolean; isPrimary: boolean }
): Promise<Ok | Fail> {
  if (!(await requireTeamEdit(session, buildingId, "manager.assign"))) return DENIED;
  const phone = normalizePhone(input.phone);
  const name = cleanText(input.name, 80);
  if (!phone) return fail("Enter a valid phone number");
  if (!name) return fail("Enter their name");
  const repo = getRepo();
  const person = await repo.ensurePerson({ name, phoneE164: phone, asCleaner: false });
  await repo.setManager(buildingId, person.accountId, {
    canEditPrice: !!input.canEditPrice,
    isPrimary: !!input.isPrimary,
  });
  return { success: true };
}

export async function removeBuildingManager(session: Session, buildingId: string, accountId: string): Promise<Ok | Fail> {
  if (!(await requireTeamEdit(session, buildingId, "manager.assign"))) return DENIED;
  await getRepo().removeManager(buildingId, accountId);
  return { success: true };
}
