export interface Employee {
  id: string;
  name: string;
  email: string;
  takingNewWork: boolean;
  newJobAlerts: boolean;
  preferredDays: DayOfWeek[];
  preferredAreas: string[];
  /** Contract hourly rate used to compute job/route pay from expected hours. */
  hourlyRate: number;
  /** When false, pay amounts are hidden throughout the app for this cleaner. */
  showPrices: boolean;
}

export type DayOfWeek =
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat"
  | "Sun";

export type JobStatus =
  | "open"
  | "claimed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "exception";

/** Airtable Jobs.Status values this app writes. Ready/Upcoming are n8n-owned and read as "open". */
export type AirtableJobStatus =
  | "Ready"
  | "Upcoming"
  | "Open"
  | "Claimed"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Exception";

export interface CleaningJob {
  id: string;
  unitLabel: string;
  propertyName: string;
  address: string;
  area: string;
  pay: number;
  expectedHours: number;
  status: JobStatus;
  cleaningWindow: string;
  deadline: string;
  /** Raw YYYY-MM-DD checkout date, for grouping/sorting by days remaining. */
  deadlineDate?: string;
  /** Raw YYYY-MM-DD date the next guest checks in, for the same-day/days-left tag. */
  nextCheckinDate?: string;
  availableAfter?: string;
  access: string;
  important?: string;
  specialRequirements: string[];
  routeId?: string;
  positionInRoute?: number;
  completedAt?: string;
  completionNote?: string;
}

export type RoomState =
  | "Occupied"
  | "Dirty"
  | "Clean"
  | "Cleaning"
  | "Unknown";

export interface Unit {
  id: string;
  unitLabel: string;
  propertyName: string;
  area: string;
  roomState: RoomState;
  currentStayCheckout?: string;
  nextCheckin?: string;
  lastClean?: string;
  assignedCleaner?: string;
  isClean?: boolean;
}

export type RouteStatus = "open" | "claimed" | "in_progress" | "completed";

export interface CleaningRoute {
  id: string;
  name: string;
  area: string;
  totalPay: number;
  jobIds: string[];
  availableAfter: string;
  deadline: string;
  /** Raw YYYY-MM-DD deadline date, for grouping/sorting by days remaining. */
  deadlineDate?: string;
  status: RouteStatus;
  completedAt?: string;
}

export type IssueCategory =
  | "Supplies Needed"
  | "Maintenance Issue"
  | "Damage / Property Concern"
  | "Access Problem"
  | "Cleaning Concern"
  | "Schedule Issue"
  | "Other";

export interface IssueReport {
  id: string;
  category: IssueCategory;
  description: string;
  employeeName: string;
  jobId?: string;
  routeId?: string;
  unitLabel?: string;
  createdAt: string;
  awaitingFollowUp: boolean;
}

export interface ClaimResult {
  success: boolean;
  conflict?: boolean;
  message?: string;
}

export const ISSUE_CATEGORIES: IssueCategory[] = [
  "Supplies Needed",
  "Maintenance Issue",
  "Damage / Property Concern",
  "Access Problem",
  "Cleaning Concern",
  "Schedule Issue",
  "Other",
];
