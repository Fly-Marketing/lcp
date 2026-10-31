import type { Session } from "@/lib/auth/types";
import { hasRole } from "@/lib/auth/permissions";

export type NavKey = "properties" | "jobs" | "management";

export interface NavItem {
  key: NavKey;
  label: string;
  href: string;
}

const ITEMS: Record<NavKey, NavItem> = {
  properties: { key: "properties", label: "Properties", href: "/pilot/properties" },
  jobs: { key: "jobs", label: "Schedule", href: "/pilot/jobs" },
  management: { key: "management", label: "Management", href: "/pilot/management" },
};

// My account opens from the header pill. Management (team, accounts, properties) shows to staff only.
// Cleaner-only: Today · Jobs (Jobs shows their accepted jobs). Owner/manager/admin: Properties · Jobs · Management.
// Both: union, with Today first.
export function navFor(session: Session): NavItem[] {
  const cleaner = hasRole(session, "cleaner");
  const staff = session.isAdmin || hasRole(session, "owner") || hasRole(session, "manager");
  const keys: NavKey[] = [];

  if (staff) keys.push("properties", "jobs", "management");
  else if (cleaner) keys.push("jobs");
  return keys.map((k) => ITEMS[k]);
}

// Where a user lands after signing in with no specific destination.
export function homeFor(session: Session): string {
  if (hasRole(session, "owner") || hasRole(session, "manager")) return "/pilot/properties";
  if (hasRole(session, "cleaner")) return "/pilot/jobs";
  return "/pilot/account";
}
