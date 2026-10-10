export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
}

export interface PilotJob {
  id: string;
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
  completedAt: string | null;
  ownerName: string | null;
  ownerMobile: string | null;
  checklistItems: ChecklistItem[];
}

export interface PilotReport {
  id: string;
  category: string;
  description: string;
  urgent: boolean;
  photoUrls: string[];
  status: string;
  createdAt: string;
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
