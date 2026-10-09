import "server-only";
import type { PilotJob } from "@/lib/pilot/types";

// In-memory fake data store, used only when PILOT_USE_FAKE_DATA=true.
// Mutations (accept/complete/report) actually change this in-process state,
// so the UI behaves like the real thing without ever touching Supabase.
// Resets on every server restart/redeploy — that's intentional, not a bug.

export const FAKE_STAFF = { id: "fake-staff-1", name: "Eddy (fake)" };

export const FAKE_TOKEN = "fake-link-1";

interface FakeJob extends PilotJob {
  claimedAt: string | null;
  completedAt: string | null;
}

const fakeJobs: FakeJob[] = [
  {
    id: "fake-job-1",
    unitLabel: "Suite 3B",
    propertyName: "Macewan B&B (fake)",
    address: "10608 106 St Edmonton, AB T5H 2X8",
    checkoutDate: "2026-10-09",
    checkoutTime: "11:00",
    nextCheckInDate: "2026-10-14",
    expectedHours: 2,
    status: "Upcoming",
    claimedAt: null,
    completedAt: null,
  },
  {
    id: "fake-job-2",
    unitLabel: "Suite 5",
    propertyName: "Macewan B&B (fake)",
    address: "10608 106 St Edmonton, AB T5H 2X8",
    checkoutDate: "2026-10-11",
    checkoutTime: "11:00",
    nextCheckInDate: "2026-10-14",
    expectedHours: 2,
    status: "Upcoming",
    claimedAt: null,
    completedAt: null,
  },
  {
    id: "fake-job-3",
    unitLabel: "Suite 1",
    propertyName: "Macewan B&B (fake)",
    address: "10608 106 St Edmonton, AB T5H 2X8",
    checkoutDate: "2026-10-11",
    checkoutTime: "11:00",
    nextCheckInDate: "2026-10-15",
    expectedHours: 2,
    status: "Upcoming",
    claimedAt: null,
    completedAt: null,
  },
];

export function fakeGetStaffForToken(token: string) {
  if (token !== FAKE_TOKEN) return null;
  return FAKE_STAFF;
}

export function fakeGetJobsForStaff(staffId: string): PilotJob[] {
  if (staffId !== FAKE_STAFF.id) return [];
  return fakeJobs
    .filter((j) => !j.completedAt)
    .map(({ claimedAt, completedAt, ...job }) => job);
}

export function fakeAcceptJob(jobId: string) {
  const job = fakeJobs.find((j) => j.id === jobId);
  if (!job) return { success: false, message: "Fake job not found" };
  job.status = "Claimed";
  job.claimedAt = new Date().toISOString();
  return { success: true };
}

export function fakeCompleteJob(jobId: string) {
  const job = fakeJobs.find((j) => j.id === jobId);
  if (!job) return { success: false, message: "Fake job not found" };
  job.status = "Completed";
  job.completedAt = new Date().toISOString();
  return { success: true };
}

export function fakeReportIssue(jobId: string, description: string) {
  const job = fakeJobs.find((j) => j.id === jobId);
  if (!job) return { success: false, message: "Fake job not found" };
  // eslint-disable-next-line no-console
  console.log(`[fake report] job=${jobId} description=${description}`);
  return { success: true };
}
