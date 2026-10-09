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
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const fakeJobs: FakeJob[] = [
  {
    id: "fake-job-1",
    unitLabel: "Suite 3B",
    propertyName: "Macewan B&B (fake)",
    address: "10608 106 St Edmonton, AB T5H 2X8",
    checkoutDate: todayISO(),
    checkoutTime: "11:00",
    nextCheckInDate: todayISO(),
    expectedHours: 2,
    status: "Upcoming",
    claimedAt: null,
    completedAt: null,
    accessInstructions: "Lockbox code 4471. Key is on the hook inside the pantry door.",
    importantNotes: "Same-day turnover — guest checks in at 4pm, clean this first.",
    specialRequirements: "Pet-friendly unit, vacuum under the couch.",
  },
  {
    id: "fake-job-2",
    unitLabel: "Suite 5",
    propertyName: "Macewan B&B (fake)",
    address: "10608 106 St Edmonton, AB T5H 2X8",
    checkoutDate: todayISO(),
    checkoutTime: "11:00",
    nextCheckInDate: addDaysISO(3),
    expectedHours: 2,
    status: "Upcoming",
    claimedAt: null,
    completedAt: null,
    accessInstructions: "Smart lock, code 8842#.",
    importantNotes: null,
    specialRequirements: null,
  },
  {
    id: "fake-job-3",
    unitLabel: "Suite 1",
    propertyName: "Macewan B&B (fake)",
    address: "10608 106 St Edmonton, AB T5H 2X8",
    checkoutDate: addDaysISO(2),
    checkoutTime: "11:00",
    nextCheckInDate: addDaysISO(4),
    expectedHours: 2,
    status: "Upcoming",
    claimedAt: null,
    completedAt: null,
    accessInstructions: "Front desk has a spare key, ask for Suite 1.",
    importantNotes: "Owner asked for extra towels this week.",
    specialRequirements: null,
  },
  {
    id: "fake-job-4",
    unitLabel: "Suite 4",
    propertyName: "Macewan B&B (fake)",
    address: "10608 106 St Edmonton, AB T5H 2X8",
    checkoutDate: addDaysISO(-2),
    checkoutTime: "11:00",
    nextCheckInDate: addDaysISO(-2),
    expectedHours: 2,
    status: "Completed",
    claimedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    accessInstructions: "Lockbox code 4471.",
    importantNotes: null,
    specialRequirements: null,
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
    .map(({ claimedAt: _claimedAt, ...job }) => job);
}

export function fakeGetCompletedJobsForStaff(staffId: string): PilotJob[] {
  if (staffId !== FAKE_STAFF.id) return [];
  return fakeJobs
    .filter((j) => j.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .map(({ claimedAt: _claimedAt, ...job }) => job);
}

export function fakeGetJobById(jobId: string): PilotJob | null {
  const job = fakeJobs.find((j) => j.id === jobId);
  if (!job) return null;
  const { claimedAt: _claimedAt, ...rest } = job;
  return rest;
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

export function fakeReportIssue(
  jobId: string,
  description: string,
  category: string,
  urgent: boolean,
  photoUrls: string[]
) {
  const job = fakeJobs.find((j) => j.id === jobId);
  if (!job) return { success: false, message: "Fake job not found" };
  // eslint-disable-next-line no-console
  console.log(
    `[fake report] job=${jobId} category=${category} urgent=${urgent} photos=${photoUrls.length} description=${description}`
  );
  return { success: true };
}
