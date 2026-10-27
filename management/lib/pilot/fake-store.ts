import "server-only";
import { DEFAULT_CHECKLIST_ITEMS, type PilotJob, type PilotReport } from "@/lib/pilot/types";

// In-memory fake data store, used only when PILOT_USE_FAKE_DATA=true.
// Mutations (accept/complete/report) actually change this in-process state,
// so the UI behaves like the real thing without ever touching Supabase.
// Resets on every server restart/redeploy — that's intentional, not a bug.

export const FAKE_STAFF = { id: "fake-staff-1", name: "Eddy (fake)", mobile: "7805551234" };

export const FAKE_TOKEN = "fake-link-1";

type FakeJob = PilotJob;

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
    cancelledAt: null,
    accessInstructions: "Lockbox code 4471. Key is on the hook inside the pantry door.",
    importantNotes: "Same-day turnover — guest checks in at 4pm, clean this first.",
    specialRequirements: "Pet-friendly unit, vacuum under the couch.",
    ownerName: "Caitlyn (fake)",
    ownerMobile: "7805550123",
    // Custom override — tests the per-unit checklist path, not the default fallback.
    checklistItems: [
      { id: "hot_tub", title: "Check hot tub chemicals", description: "Test pH and chlorine levels" },
      { id: "trash", title: "Trash out", description: "All trash and recycling removed" },
      { id: "linens", title: "Linens changed", description: "Fresh sheets and towels" },
      { id: "walkthrough", title: "Final walkthrough", description: "Nothing left behind, doors locked" },
    ],
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
    cancelledAt: null,
    accessInstructions: "Smart lock, code 8842#.",
    importantNotes: null,
    specialRequirements: null,
    ownerName: null,
    ownerMobile: null,
    checklistItems: DEFAULT_CHECKLIST_ITEMS,
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
    cancelledAt: null,
    accessInstructions: "Front desk has a spare key, ask for Suite 1.",
    importantNotes: "Owner asked for extra towels this week.",
    specialRequirements: null,
    ownerName: "Caitlyn (fake)",
    ownerMobile: "7805550123",
    checklistItems: DEFAULT_CHECKLIST_ITEMS,
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
    cancelledAt: null,
    accessInstructions: "Lockbox code 4471.",
    importantNotes: null,
    specialRequirements: null,
    ownerName: "Caitlyn (fake)",
    ownerMobile: "7805550123",
    checklistItems: DEFAULT_CHECKLIST_ITEMS,
  },
  {
    id: "fake-job-5",
    unitLabel: "Suite 2",
    propertyName: "Macewan B&B (fake)",
    address: "10608 106 St Edmonton, AB T5H 2X8",
    checkoutDate: addDaysISO(-5),
    checkoutTime: "11:00",
    nextCheckInDate: addDaysISO(-5),
    expectedHours: 2,
    status: "Completed",
    claimedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: null,
    accessInstructions: "Smart lock, code 8842#.",
    importantNotes: null,
    specialRequirements: null,
    ownerName: "Caitlyn (fake)",
    ownerMobile: "7805550123",
    checklistItems: DEFAULT_CHECKLIST_ITEMS,
  },
  {
    id: "fake-job-6",
    unitLabel: "Suite 6",
    propertyName: "Macewan B&B (fake)",
    address: "10608 106 St Edmonton, AB T5H 2X8",
    checkoutDate: todayISO(),
    checkoutTime: "11:00",
    nextCheckInDate: addDaysISO(1),
    expectedHours: 2,
    status: "Upcoming",
    claimedAt: null,
    completedAt: null,
    cancelledAt: null,
    accessInstructions: null,
    importantNotes: null,
    specialRequirements: null,
    ownerName: "Caitlyn (fake)",
    ownerMobile: "7805550123",
    checklistItems: DEFAULT_CHECKLIST_ITEMS,
  },
];

// Keyed by jobId. fake-job-5 starts with a pre-existing report so the
// "completed clean with a report attached" history state is testable
// without having to submit one first.
const fakeReports: Record<string, PilotReport[]> = {
  "fake-job-5": [
    {
      id: "fake-report-1",
      category: "Maintenance Issue",
      description: "Bathroom faucet is dripping, needs a plumber.",
      urgent: false,
      photoUrls: [],
      status: "New",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export function fakeGetStaffForToken(token: string) {
  if (token !== FAKE_TOKEN) return null;
  return FAKE_STAFF;
}

export function fakeGetJobsForStaff(staffId: string): PilotJob[] {
  if (staffId !== FAKE_STAFF.id) return [];
  return fakeJobs
    .filter(
      (job) =>
        !job.completedAt &&
        !job.cancelledAt &&
        ["Open", "Upcoming", "Ready"].includes(job.status)
    )
    .map((job) => ({ ...job }));
}

export function fakeGetCompletedJobsForStaff(staffId: string): PilotJob[] {
  if (staffId !== FAKE_STAFF.id) return [];
  return fakeJobs
    .filter((j) => j.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .map((job) => ({ ...job }));
}

export function fakeGetMyJobsForStaff(staffId: string): PilotJob[] {
  if (staffId !== FAKE_STAFF.id) return [];
  return fakeJobs
    .filter((job) => !job.cancelledAt && (job.claimedAt || job.completedAt))
    .sort((a, b) => {
      const rank = (job: FakeJob) => (job.completedAt ? 1 : 0);
      const rankDifference = rank(a) - rank(b);
      if (rankDifference !== 0) return rankDifference;
      return (b.checkoutDate ?? "").localeCompare(a.checkoutDate ?? "");
    })
    .map((job) => ({ ...job }));
}

export function fakeGetJobById(jobId: string): PilotJob | null {
  const job = fakeJobs.find((j) => j.id === jobId);
  if (!job) return null;
  return { ...job };
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

export function fakeUpdateCompletedJob(
  jobId: string,
  state: string
) {
  const job = fakeJobs.find((j) => j.id === jobId);
  if (!job) return { success: false, message: "Fake job not found" };
  job.status = state;
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

  const report: PilotReport = {
    id: `fake-report-${Date.now()}`,
    category,
    description,
    urgent,
    photoUrls,
    status: "New",
    createdAt: new Date().toISOString(),
  };
  fakeReports[jobId] = [report, ...(fakeReports[jobId] ?? [])];

  return { success: true };
}

export function fakeGetReportsForJob(jobId: string): PilotReport[] {
  return fakeReports[jobId] ?? [];
}

export function fakeUpdateReport(
  reportId: string,
  description: string,
  category: string,
  urgent: boolean,
  photoUrls: string[]
) {
  for (const reports of Object.values(fakeReports)) {
    const report = reports.find((item) => item.id === reportId);
    if (!report) continue;
    report.description = description;
    report.category = category;
    report.urgent = urgent;
    report.photoUrls = photoUrls;
    return { success: true };
  }

  return { success: false, message: "Fake report not found" };
}

export function fakeDeleteReport(reportId: string) {
  for (const [jobId, reports] of Object.entries(fakeReports)) {
    const index = reports.findIndex((report) => report.id === reportId);
    if (index === -1) continue;
    fakeReports[jobId] = reports.filter((_, reportIndex) => reportIndex !== index);
    return { success: true };
  }

  return { success: false, message: "Fake report not found" };
}
