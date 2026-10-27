export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
}

export interface PilotJob {
  id: string;
  unitId: string | null;
  buildingId: string | null;
  unitLabel: string;
  propertyName: string;
  address: string;
  checkoutDate: string | null;
  checkoutTime: string | null;
  nextCheckInDate: string | null;
  expectedHours: number;
  status: string;
  accessInstructions: string | null;
  importantNotes: string | null;
  specialRequirements: string | null;
  specialRequest: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  assignedStaffId: string | null;
  // Owner/manager views only; null for cleaners. The customer price, never cleaner pay.
  price: number | null;
  assignedCleanerName: string | null;
  source: string | null;
  ownerName: string | null;
  ownerMobile: string | null;
  checklistItems: ChecklistItem[];
}

export interface PilotReport {
  id: string;
  jobId: string;
  staffId: string | null;
  category: string;
  description: string;
  urgent: boolean;
  photos: { path: string; url: string | null }[];
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

export type IssueCategory =
  | "Supplies Needed"
  | "Maintenance Issue"
  | "Damage / Property Concern"
  | "Access Problem"
  | "Cleaning Concern"
  | "Schedule Issue"
  | "Other";

export const ISSUE_CATEGORIES: IssueCategory[] = [
  "Supplies Needed",
  "Maintenance Issue",
  "Damage / Property Concern",
  "Access Problem",
  "Cleaning Concern",
  "Schedule Issue",
  "Other",
];

// Fallback used when a unit has no checklist_items override set.
export const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "trash", title: "Trash out", description: "All trash and recycling removed" },
  { id: "linens", title: "Linens changed", description: "Fresh sheets and towels" },
  { id: "surfaces", title: "Surfaces cleaned", description: "Kitchen, bathroom, counters" },
  { id: "restocked", title: "Restocked", description: "Toiletries, coffee, paper towels" },
  { id: "walkthrough", title: "Final walkthrough", description: "Nothing left behind, doors locked" },
];
