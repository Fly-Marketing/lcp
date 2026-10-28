import type { Session } from "@/lib/auth/types";
import { hasRole } from "@/lib/auth/permissions";

export type NavKey = "today" | "properties" | "jobs" | "team";

export interface NavItem {
  key: NavKey;
  label: string;
  href: string;
}

const ITEMS: Record<NavKey, NavItem> = {
  today: { key: "today", label: "Today", href: "/pilot/today" },
  properties: { key: "properties", label: "Properties", href: "/pilot/properties" },
  jobs: { key: "jobs", label: "Jobs", href: "/pilot/jobs" },
  team: { key: "team", label: "Team", href: "/pilot/team" },
};

// Account (phone, devices, sign-out) lives in the header. Admin tools live under Team.
// Cleaner-only: Today · Jobs (Jobs shows their accepted jobs). Owner/manager/admin: Properties · Jobs · Team.
// Both: union, with Today first.
export function navFor(session: Session): NavItem[] {
  const cleaner = hasRole(session, "cleaner");
  const staff = session.isAdmin || hasRole(session, "owner") || hasRole(session, "manager");
  const keys: NavKey[] = [];

  if (cleaner) keys.push("today");
  if (staff) keys.push("properties", "jobs", "team");
  else if (cleaner) keys.push("jobs");
  return keys.map((k) => ITEMS[k]);
}

// Where a user lands after signing in with no specific destination.
export function homeFor(session: Session): string {
  if (hasRole(session, "owner") || hasRole(session, "manager")) return "/pilot/properties";
  if (hasRole(session, "cleaner")) return "/pilot/today";
  return "/pilot/account";
}
