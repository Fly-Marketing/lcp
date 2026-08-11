"use server";

import { revalidatePath } from "next/cache";

import {
  createRecord,
  listRecords,
  TABLE_BUNDLES,
  TABLE_JOBS,
  TABLE_REPORTS,
  TABLE_STAFF,
  updateRecord,
} from "@/lib/airtable/client";
import type {
  BundlesWriteFields,
  JobsFields,
  JobsWriteFields,
  ReportsWriteFields,
  StaffFields,
} from "@/lib/airtable/schema";
import { getAllJobs, getJobsForRoute } from "@/lib/airtable/queries";
import { clearSession, createSession, getSessionStaffId } from "@/lib/session";
import type { ClaimResult, IssueCategory } from "@/lib/types";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10);
}

export interface LoginResult {
  success: boolean;
  message?: string;
}

export async function verifyLogin(
  phone: string,
  pin: string
): Promise<LoginResult> {
  const normalizedInput = normalizePhone(phone);
  if (!normalizedInput || !pin) {
    return { success: false, message: "Enter your phone number and PIN." };
  }

  const staff = await listRecords<StaffFields>(TABLE_STAFF());
  const match = staff.find(
    (s) =>
      s.fields.Active &&
      normalizePhone(s.fields.Mobile ?? "") === normalizedInput &&
      s.fields.PIN === pin
  );

  if (!match) {
    return { success: false, message: "Phone number or PIN is incorrect." };
  }

  await createSession(match.id);
  return { success: true };
}

export async function logout(): Promise<void> {
  await clearSession();
}

/** Looks up the logged-in staff record's identifying fields for write-attribution. Returns null if no valid session. */
async function getSessionStaff(): Promise<{ id: string; staffId: string; name: string } | null> {
  const staffRecordId = await getSessionStaffId();
  if (!staffRecordId) return null;

  const [record] = await listRecords<StaffFields>(TABLE_STAFF(), {
    filterByFormula: `RECORD_ID() = "${staffRecordId}"`,
  });
  if (!record) return null;

  return {
    id: record.id,
    staffId: record.fields["Staff ID"] ?? record.id,
    name: record.fields.Name ?? "",
  };
}

const OPEN_STATUSES = new Set(["Ready", "Upcoming", "Open"]);

function nowIso() {
  return new Date().toISOString();
}

async function isJobStillOpen(jobId: string): Promise<boolean> {
  const [record] = await listRecords<JobsFields>(TABLE_JOBS(), {
    filterByFormula: `RECORD_ID() = "${jobId}"`,
  });
  return record ? OPEN_STATUSES.has(record.fields.Status ?? "") : false;
}

export async function claimJob(jobId: string): Promise<ClaimResult> {
  const staff = await getSessionStaff();
  if (!staff) {
    return { success: false, message: "You must be signed in to claim a job." };
  }

  const stillOpen = await isJobStillOpen(jobId);
  if (!stillOpen) {
    return {
      success: false,
      conflict: true,
      message: "This job was just claimed by another team member.",
    };
  }

  await updateRecord<JobsWriteFields>(TABLE_JOBS(), jobId, {
    Status: "Claimed",
    "Claimed At": nowIso(),
    "Assigned Staff ID": staff.staffId,
    "Assigned Cleaner": staff.name,
  });

  revalidatePath("/");
  revalidatePath("/work");
  return { success: true };
}

export async function claimRoute(routeId: string): Promise<ClaimResult> {
  const staff = await getSessionStaff();
  if (!staff) {
    return { success: false, message: "You must be signed in to claim a route." };
  }

  const jobs = await getJobsForRoute(routeId);
  const openJobs = jobs.filter((job) => job.status === "open");

  if (openJobs.length === 0) {
    return {
      success: false,
      conflict: true,
      message: "This route was just claimed by another team member.",
    };
  }

  await Promise.all(
    openJobs.map((job) =>
      updateRecord<JobsWriteFields>(TABLE_JOBS(), job.id, {
        Status: "Claimed",
        "Claimed At": nowIso(),
        "Assigned Staff ID": staff.staffId,
        "Assigned Cleaner": staff.name,
      })
    )
  );

  await updateRecord<BundlesWriteFields>(TABLE_BUNDLES(), routeId, {
    "Claimed At": nowIso(),
    "Assigned Staff ID": staff.staffId,
    "Assigned Cleaner": staff.name,
  });

  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath(`/routes/${routeId}`);
  return { success: true };
}

export async function startClean(jobId: string): Promise<{ success: true }> {
  await updateRecord<JobsWriteFields>(TABLE_JOBS(), jobId, {
    Status: "In Progress",
  });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

export async function completeClean(
  jobId: string,
  note?: string
): Promise<{ success: true }> {
  const fields: JobsWriteFields = {
    Status: "Completed",
    "Completed At": nowIso(),
  };
  if (note) fields.Notes = note;

  await updateRecord<JobsWriteFields>(TABLE_JOBS(), jobId, fields);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/complete`);
  revalidatePath("/work");
  revalidatePath("/");
  return { success: true };
}

export interface SubmitReportInput {
  category: IssueCategory;
  description: string;
  jobId?: string;
}

export async function submitReport(
  input: SubmitReportInput
): Promise<{ success: true }> {
  const staff = await getSessionStaff();

  await createRecord<ReportsWriteFields>(TABLE_REPORTS(), {
    Description: input.description,
    Category: input.category,
    "Job ID": input.jobId,
    "Staff ID": staff?.staffId,
    Status: "New",
  });

  revalidatePath("/report");
  return { success: true };
}

export async function getJobsSnapshot() {
  return getAllJobs();
}
