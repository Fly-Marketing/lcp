import type { Session } from "@/lib/auth/types";
import { hasRole } from "@/lib/auth/permissions";

export type NavKey = "today" | "my-jobs" | "properties" | "jobs" | "team" | "account" | "admin";

export interface NavItem {
  key: NavKey;
  label: string;
  href: string;
}

const ITEMS: Record<NavKey, NavItem> = {
  today: { key: "today", label: "Today", href: "/pilot/today" },
  "my-jobs": { key: "my-jobs", label: "My Jobs", href: "/pilot/my-jobs" },
  properties: { key: "properties", label: "Properties", href: "/pilot/properties" },
  jobs: { key: "jobs", label: "Jobs", href: "/pilot/jobs" },
  team: { key: "team", label: "Team", href: "/pilot/team" },
  account: { key: "account", label: "Account", href: "/pilot/account" },
  admin: { key: "admin", label: "Admin", href: "/pilot/admin" },
};

// Cleaner-only: Today · My Jobs · Account. Owner/manager: Properties · Jobs · Team · Account.
// Both (e.g. a manager who also cleans): union, with Today folded into Jobs/My Jobs.
export function navFor(session: Session): NavItem[] {
  const cleaner = hasRole(session, "cleaner");
  const ownerOrManager = hasRole(session, "owner") || hasRole(session, "manager");
  const keys: NavKey[] = [];

  if (ownerOrManager) {
    keys.push("properties", "jobs");
    if (cleaner) keys.push("my-jobs");
    keys.push("team");
  } else if (cleaner) {
    keys.push("today", "my-jobs");
  }
  keys.push("account");
  if (session.isAdmin) keys.push("admin");
  return keys.map((k) => ITEMS[k]);
}

// Where a user lands after signing in with no specific destination.
export function homeFor(session: Session): string {
  if (hasRole(session, "owner") || hasRole(session, "manager")) return "/pilot/properties";
  if (hasRole(session, "cleaner")) return "/pilot/today";
  return "/pilot/account";
}
