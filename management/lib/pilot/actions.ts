"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { kickNotifications } from "@/lib/auth/sender";
import * as svc from "@/lib/pilot/service";
import type { IssueCategory } from "@/lib/pilot/types";

// Thin server-action wrappers: resolve the session from the trusted-device cookie, then
// delegate to the service layer, which authorizes the specific building/job. No identity
// (staff id, account id) ever comes from the client.

type Result = { success: true } | { success: false; message: string };

function refresh(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

export async function acceptJob(jobId: string): Promise<Result> {
  const session = await requireSession();
  const r = await svc.acceptJob(session, jobId);
  if (r.success) refresh("/pilot/jobs");
  return r;
}

export async function completeJob(jobId: string): Promise<Result> {
  const session = await requireSession();
  const r = await svc.completeJob(session, jobId);
  if (r.success) refresh("/pilot/jobs", "/pilot/properties");
  return r;
}

export async function updateCompletedJob(jobId: string, state: string): Promise<Result> {
  const session = await requireSession();
  const r = await svc.setCompletedJobResult(session, jobId, state);
  if (r.success) refresh("/pilot/jobs", "/pilot/properties", "/pilot/jobs");
  return r;
}

export async function reportIssue(
  jobId: string,
  description: string,
  category: IssueCategory,
  urgent: boolean,
  photoPaths: string[]
): Promise<Result> {
  const session = await requireSession();
  const r = await svc.createReport(session, jobId, { description, category, urgent, photoPaths });
  if (r.success) refresh("/pilot/jobs", "/pilot/properties", "/pilot/jobs");
  return r;
}

export async function updateReport(
  reportId: string,
  description: string,
  category: IssueCategory,
  urgent: boolean,
  photoPaths: string[]
): Promise<Result> {
  const session = await requireSession();
  const r = await svc.editReport(session, reportId, { description, category, urgent, photoPaths });
  if (r.success) refresh("/pilot/jobs", "/pilot/properties", "/pilot/jobs");
  return r;
}

export async function deleteReport(reportId: string): Promise<Result> {
  const session = await requireSession();
  const r = await svc.removeReport(session, reportId);
  if (r.success) refresh("/pilot/jobs", "/pilot/properties", "/pilot/jobs");
  return r;
}

export async function resolveReport(reportId: string): Promise<Result> {
  const session = await requireSession();
  const r = await svc.resolveReportAction(session, reportId);
  if (r.success) refresh("/pilot/properties", "/pilot/jobs");
  return r;
}

export async function uploadReportPhoto(
  jobId: string,
  formData: FormData
): Promise<{ success: true; path: string; previewUrl: string | null } | { success: false; message: string }> {
  const session = await requireSession();
  const file = formData.get("photo");
  if (!(file instanceof File)) return { success: false, message: "No file provided" };
  const r = await svc.uploadReportPhoto(session, jobId, file);
  if (!r.success) return r;
  return { success: true, path: r.data.path, previewUrl: r.data.previewUrl };
}

// ---- owner / manager ----

export async function createCleaningJob(input: {
  unitId: string;
  date: string;
  time?: string | null;
  specialRequest?: string | null;
  idempotencyKey: string;
}): Promise<{ success: true; jobId: string } | { success: false; message: string }> {
  const session = await requireSession();
  const r = await svc.createManualJob(session, input);
  if (!r.success) return r;
  refresh("/pilot/properties", "/pilot/jobs");
  // Notifications are delivered by n8n from the outbox; nudge it without delaying the response.
  after(() => kickNotifications({ jobId: r.data.jobId }));
  return { success: true, jobId: r.data.jobId };
}

export async function saveUnitDetails(
  unitId: string,
  input: {
    accessInstructions?: string | null;
    importantNotes?: string | null;
    specialRequirements?: string | null;
    checklistItems?: unknown;
  }
): Promise<Result> {
  const session = await requireSession();
  const r = await svc.updateUnitDetails(session, unitId, input);
  if (r.success) refresh("/pilot/properties", "/pilot/jobs", "/pilot/management");
  return r;
}

export async function saveJobPrice(jobId: string, price: number | string, reason: string | null): Promise<Result> {
  const session = await requireSession();
  const r = await svc.setJobPrice(session, jobId, price, reason);
  if (r.success) refresh("/pilot/jobs");
  return r;
}

export async function addCleaner(
  buildingId: string,
  input: { name: string; phone: string; role?: "primary" | "backup" }
): Promise<Result> {
  const session = await requireSession();
  const r = await svc.addCleanerToBuilding(session, buildingId, input);
  if (r.success) refresh("/pilot/management");
  return r;
}

export async function removeCleaner(buildingId: string, staffId: string): Promise<Result> {
  const session = await requireSession();
  const r = await svc.removeCleanerFromBuilding(session, buildingId, staffId);
  if (r.success) refresh("/pilot/management");
  return r;
}

export async function assignManager(
  buildingId: string,
  input: { name: string; phone: string; canEditPrice: boolean; isPrimary: boolean }
): Promise<Result> {
  const session = await requireSession();
  const r = await svc.assignBuildingManager(session, buildingId, input);
  if (r.success) refresh("/pilot/management");
  return r;
}

export async function removeManager(buildingId: string, accountId: string): Promise<Result> {
  const session = await requireSession();
  const r = await svc.removeBuildingManager(session, buildingId, accountId);
  if (r.success) refresh("/pilot/management");
  return r;
}
