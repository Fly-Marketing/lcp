import type { PilotJob } from "@/lib/pilot/types";

// Statuses that mean "a clean is still to be done".
export const PENDING_STATUSES = ["Open", "Upcoming", "Ready", "Claimed"];
export const FLAGGED_RESULTS = ["Needs attention", "Not clean"];

export type OwnerStatus = "Scheduled" | "Accepted" | "Clean" | "Flagged" | "Cancelled";

// Owner-facing wording for a job. Never exposes staffing internals.
export function ownerStatus(job: Pick<PilotJob, "status" | "cancelledAt" | "completedAt">): OwnerStatus {
  if (job.cancelledAt || job.status === "Cancelled") return "Cancelled";
  if (FLAGGED_RESULTS.includes(job.status)) return "Flagged";
  if (job.completedAt || job.status === "Completed") return "Clean";
  if (job.status === "Claimed") return "Accepted";
  return "Scheduled";
}

export type UnitStatus = "Ready" | "Needs clean" | "Flagged";

export interface UnitStatusInput {
  jobs: Pick<PilotJob, "status" | "cancelledAt" | "completedAt" | "checkoutDate">[];
  openReports: number;
}

// Flagged: an unresolved report, or the latest finished clean was marked Needs attention / Not clean.
// Needs clean: a non-cancelled job is still pending. Otherwise Ready.
export function unitStatus({ jobs, openReports }: UnitStatusInput): UnitStatus {
  const live = jobs.filter((j) => !j.cancelledAt && j.status !== "Cancelled");
  const finished = live
    .filter((j) => j.completedAt || j.status === "Completed" || FLAGGED_RESULTS.includes(j.status))
    .sort((a, b) => (b.checkoutDate ?? "").localeCompare(a.checkoutDate ?? ""));
  const latestFlagged = finished.length > 0 && FLAGGED_RESULTS.includes(finished[0].status);
  if (openReports > 0 || latestFlagged) return "Flagged";
  if (live.some((j) => PENDING_STATUSES.includes(j.status) && !j.completedAt)) return "Needs clean";
  return "Ready";
}

export function firstName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.trim().split(/\s+/)[0] || null;
}
