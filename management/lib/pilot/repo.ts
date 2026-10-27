import type { ManagementMode } from "@/lib/auth/types";
import type { ChecklistItem } from "@/lib/pilot/types";

// Data-access contract. NO authorization lives here: the service layer
// (lib/pilot/service.ts) authorizes every call, then uses the repo. There are two
// implementations — Supabase (repo-supabase.ts) and in-memory (repo-fake.ts) — so
// the same service logic runs against both, including in unit tests.

export interface BuildingRow {
  id: string;
  name: string;
  address: string | null;
  managementMode: ManagementMode;
  customerId: string | null;
  customerName: string | null;
  customerMobile: string | null;
}

export interface UnitRow {
  id: string;
  buildingId: string | null;
  name: string;
  address: string | null;
  accessInstructions: string | null;
  importantNotes: string | null;
  specialRequirements: string | null;
  checklistItems: ChecklistItem[] | null;
  standardRate: number | null;
  expectedHours: number | null;
  checkoutTime: string | null;
  active: boolean;
}

export interface JobRow {
  id: string;
  unitId: string | null;
  buildingId: string | null;
  checkoutDate: string | null;
  checkoutTime: string | null;
  nextCheckInDate: string | null;
  latestCleanDate: string | null;
  expectedHours: number | null;
  status: string;
  claimedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  specialRequest: string | null;
  price: number | null;
  source: string | null;
  createdAt: string;
}

export interface ReportRow {
  id: string;
  jobId: string;
  unitId: string | null;
  buildingId: string | null;
  staffId: string | null;
  category: string;
  description: string;
  urgent: boolean;
  photoPaths: string[];
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CleanerRow {
  buildingId: string;
  staffId: string;
  accountId: string | null;
  name: string;
  mobile: string | null;
  role: "primary" | "backup";
}

export interface ManagerRow {
  buildingId: string;
  accountId: string;
  name: string;
  phone: string;
  canEditPrice: boolean;
  isPrimary: boolean;
}

export interface JobQuery {
  buildingIds: string[];
  statuses?: string[];
  assignedStaffId?: string;
  unassignedOnly?: boolean;
  onlyOpen?: boolean; // not completed, not cancelled
  onlyCompleted?: boolean;
  claimedOrCompleted?: boolean;
  includeCancelled?: boolean;
  checkoutFrom?: string; // yyyy-mm-dd inclusive
  orderBy: "checkout_asc" | "checkout_desc" | "completed_desc";
  limit?: number;
}

export interface NewReport {
  jobId: string;
  staffId: string | null;
  category: string;
  description: string;
  urgent: boolean;
  photoPaths: string[];
}

export interface UnitPatch {
  accessInstructions?: string | null;
  importantNotes?: string | null;
  specialRequirements?: string | null;
  checklistItems?: ChecklistItem[] | null;
}

export type CreateJobResult = { jobId: string; status: "created" | "duplicate" | "replayed" };

export interface PriceHistoryRow {
  oldPrice: number | null;
  newPrice: number;
  reason: string | null;
  changedAt: string;
  changedByName: string | null;
}

export interface PilotRepo {
  listBuildings(ids: string[]): Promise<BuildingRow[]>;
  listUnits(buildingIds: string[]): Promise<UnitRow[]>;
  getUnit(id: string): Promise<UnitRow | null>;
  updateUnit(id: string, patch: UnitPatch): Promise<void>;

  listJobs(q: JobQuery): Promise<JobRow[]>;
  getJob(id: string): Promise<JobRow | null>;
  /** Atomic: succeeds only if the job is still unassigned, not cancelled, and acceptable. */
  claimJob(jobId: string, staffId: string): Promise<boolean>;
  /** Atomic: succeeds only for the assigned staff member and an unfinished job. */
  completeJob(jobId: string, staffId: string): Promise<boolean>;
  setJobResult(jobId: string, state: string): Promise<boolean>;
  createOwnerJob(input: {
    unitId: string;
    date: string;
    time: string | null;
    specialRequest: string | null;
    accountId: string;
    idempotencyKey: string;
  }): Promise<CreateJobResult>;
  updateJobPrice(jobId: string, price: number, accountId: string, reason: string | null): Promise<void>;
  listPriceHistory(jobId: string): Promise<PriceHistoryRow[]>;

  listReportsForJobs(jobIds: string[]): Promise<ReportRow[]>;
  listReportsForBuildings(buildingIds: string[], openOnly: boolean): Promise<ReportRow[]>;
  getReport(id: string): Promise<ReportRow | null>;
  insertReport(r: NewReport): Promise<void>;
  updateReport(id: string, patch: Omit<NewReport, "jobId" | "staffId">): Promise<void>;
  deleteReport(id: string): Promise<void>;
  resolveReport(id: string): Promise<void>;

  uploadPhoto(jobId: string, file: File): Promise<{ path: string }>;
  signedPhotoUrl(pathOrLegacyUrl: string): Promise<string | null>;

  listCleaners(buildingIds: string[]): Promise<CleanerRow[]>;
  listManagers(buildingIds: string[]): Promise<ManagerRow[]>;
  /** Find an account by phone or create it (and a staff row for cleaners). */
  ensurePerson(input: {
    name: string;
    phoneE164: string;
    asCleaner: boolean;
  }): Promise<{ accountId: string; staffId: string | null }>;
  addCleaner(buildingId: string, staffId: string, role: "primary" | "backup"): Promise<void>;
  removeCleaner(buildingId: string, staffId: string): Promise<void>;
  setManager(
    buildingId: string,
    accountId: string,
    opts: { canEditPrice: boolean; isPrimary: boolean }
  ): Promise<void>;
  removeManager(buildingId: string, accountId: string): Promise<void>;
}
