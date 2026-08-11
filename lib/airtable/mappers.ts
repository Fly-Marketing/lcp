import type { AirtableRecord } from "@/lib/airtable/client";
import type { BundlesFields, JobsFields, StaffFields, UnitsFields } from "@/lib/airtable/schema";
import { daysUntil } from "@/lib/deadline-groups";
import type { CleaningJob, CleaningRoute, DayOfWeek, Employee, JobStatus, RoomState, Unit } from "@/lib/types";

const STATUS_MAP: Record<string, JobStatus> = {
  Ready: "open",
  Upcoming: "open",
  Open: "open",
  Claimed: "claimed",
  "In Progress": "in_progress",
  Completed: "completed",
  Cancelled: "cancelled",
  Exception: "exception",
};

export function mapJobStatus(airtableStatus: string | undefined): JobStatus {
  return STATUS_MAP[airtableStatus ?? ""] ?? "open";
}

function formatDeadline(nextCheckinDate?: string): string {
  if (!nextCheckinDate) return "No deadline set";
  const days = daysUntil(nextCheckinDate);
  if (days === 0) return "Next check-in today 3:30pm";
  if (days === 1) return "Next check-in tomorrow 3:30pm";
  if (days < 0) return "Next check-in overdue 3:30pm";
  return `Next check-in in ${days} days 3:30pm`;
}

function formatWindow(
  checkoutTime?: string,
  checkinTime?: string,
  checkoutDate?: string,
  nextCheckinDate?: string
): string {
  if (checkoutTime && checkinTime) return `${checkoutTime} - ${checkinTime}`;
  if (checkoutTime) return `After ${checkoutTime}`;
  if (checkoutDate && nextCheckinDate) return `${checkoutDate} - ${nextCheckinDate}`;
  if (checkoutDate) return `From ${checkoutDate}`;
  return "Window not set";
}

function splitLines(value?: string): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function mapJobRecord(
  job: AirtableRecord<JobsFields>,
  unit: AirtableRecord<UnitsFields> | undefined,
  hourlyRate: number
): CleaningJob {
  const f = job.fields;
  const u = unit?.fields;
  const expectedHours = f["Expected Hours"] ?? u?.["Expected Hours"] ?? 0;

  return {
    id: job.id,
    unitLabel: f["Unit Name"] ?? u?.["Unit Name"] ?? "Unit",
    propertyName: f["Property / Building"] ?? u?.["Property / Building"] ?? "",
    address: f.Address ?? u?.Address ?? "",
    area: f.Area ?? u?.Area ?? "",
    pay: Math.round(expectedHours * hourlyRate * 100) / 100,
    expectedHours,
    status: mapJobStatus(f.Status),
    cleaningWindow: formatWindow(
      f["Checkout Time"],
      f["Check-in Time"],
      f["Checkout Date"],
      f["Next Check-in Date"]
    ),
    deadline: formatDeadline(f["Next Check-in Date"]),
    deadlineDate: f["Checkout Date"],
    nextCheckinDate: f["Next Check-in Date"],
    availableAfter: f["Earliest Clean Date"]
      ? `Available after ${f["Earliest Clean Date"]}`
      : undefined,
    access: u?.["Access Instructions"] ?? "",
    important: u?.["Important Notes"],
    specialRequirements: splitLines(u?.["Special Requirements"]),
    routeId: f["Bundle ID"] || undefined,
    completedAt: f["Completed At"],
  };
}

export function mapBundleRecord(
  bundle: AirtableRecord<BundlesFields>,
  jobs: CleaningJob[]
): CleaningRoute {
  const f = bundle.fields;
  const completed = jobs.filter((j) => j.status === "completed").length;
  const routeStatus =
    completed > 0 && completed === jobs.length
      ? "completed"
      : jobs.some((j) => j.status === "in_progress" || j.status === "completed")
        ? "in_progress"
        : jobs.some((j) => j.status === "claimed")
          ? "claimed"
          : "open";

  const earliestDeadline = jobs
    .map((j) => j.deadlineDate)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  return {
    id: bundle.id,
    name: f["Bundle Key"] ? `Bundle ${f["Bundle Key"]}` : "Route",
    area: f.Area ?? "",
    totalPay: jobs.reduce((sum, j) => sum + j.pay, 0),
    jobIds: jobs.map((j) => j.id),
    availableAfter: f["Scheduled Date"] ? `Available ${f["Scheduled Date"]}` : "",
    deadline: f["Scheduled Date"] ? `Scheduled ${f["Scheduled Date"]}` : "",
    deadlineDate: earliestDeadline,
    status: routeStatus,
  };
}

const VALID_ROOM_STATES: RoomState[] = ["Occupied", "Dirty", "Clean", "Cleaning", "Unknown"];

export function mapUnitRecord(unit: AirtableRecord<UnitsFields>): Unit {
  const f = unit.fields;
  const roomState = VALID_ROOM_STATES.includes(f["Room State"] as RoomState)
    ? (f["Room State"] as RoomState)
    : "Unknown";

  let isClean: boolean | undefined;
  if (f["Cleaning Status"]) {
    isClean = f["Cleaning Status"].toLowerCase() === "clean";
  }

  return {
    id: unit.id,
    unitLabel: f["Unit Name"] ?? "Unit",
    propertyName: f["Property / Building"] ?? "",
    area: f.Area ?? "",
    roomState,
    currentStayCheckout: f["Current Stay Checkout"],
    nextCheckin: f["Next Check-in"],
    lastClean: f["Last Clean"],
    assignedCleaner: f["Assigned Cleaner"],
    isClean,
  };
}

const VALID_DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function mapStaffRecord(staff: AirtableRecord<StaffFields>): Employee {
  const f = staff.fields;
  return {
    id: staff.id,
    name: f.Name ?? "",
    email: f.Email ?? "",
    takingNewWork: f.Active ?? true,
    newJobAlerts: true,
    preferredDays: VALID_DAYS,
    preferredAreas: splitLines(f["Service Areas"]),
    hourlyRate: f["Hourly Rate"] ?? 0,
    showPrices: f["Show Prices"] ?? false,
  };
}
