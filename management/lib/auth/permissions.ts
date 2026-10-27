import type { Grant, Role, Session } from "@/lib/auth/types";

export type Action =
  | "job.view"
  | "job.accept"
  | "job.complete"
  | "job.updateResult"
  | "job.create"
  | "report.view"
  | "report.create"
  | "report.edit"
  | "report.delete"
  | "photo.view"
  | "photo.upload"
  | "unit.edit"
  | "team.view"
  | "team.edit"
  | "manager.assign"
  | "price.edit";

export interface PermissionContext {
  buildingId?: string | null;
  job?: { assignedStaffId: string | null; status: string; cancelled: boolean };
  report?: { staffId: string | null };
}

export const ACCEPTABLE_STATUSES = ["Open", "Upcoming", "Ready"];

export function grantsAt(session: Session, buildingId: string | null | undefined, roles?: Role[]): Grant[] {
  if (!buildingId) return [];
  return session.grants.filter(
    (g) => g.buildingId === buildingId && (!roles || roles.includes(g.role))
  );
}

export function hasRole(session: Session, role: Role): boolean {
  return session.grants.some((g) => g.role === role);
}

export function buildingIdsFor(session: Session, roles?: Role[]): string[] {
  const ids = new Set<string>();
  for (const g of session.grants) {
    if (!roles || roles.includes(g.role)) ids.add(g.buildingId);
  }
  return [...ids];
}

// Deny by default. Every server action and query must go through this.
export function can(session: Session | null, action: Action, ctx: PermissionContext = {}): boolean {
  if (!session) return false;
  const b = ctx.buildingId;
  const at = (roles?: Role[]) => grantsAt(session, b, roles);
  const isOwnerOrManager = at(["owner", "manager"]).length > 0;
  const isManager = at(["manager"]).length > 0;

  switch (action) {
    case "job.view":
    case "report.view":
    case "photo.view": {
      if (session.isAdmin || isOwnerOrManager) return true;
      // Cleaners: only jobs assigned to them, or unclaimed jobs they could accept.
      // Never other cleaners' claimed jobs (those carry access instructions).
      const job = ctx.job;
      if (!job || at(["cleaner"]).length === 0) return false;
      if (session.staffId !== null && job.assignedStaffId === session.staffId) return true;
      return job.assignedStaffId === null && !job.cancelled && ACCEPTABLE_STATUSES.includes(job.status);
    }

    case "job.accept": {
      const job = ctx.job;
      if (!job || !b) return false;
      return (
        at(["cleaner"]).length > 0 &&
        session.staffId !== null &&
        job.assignedStaffId === null &&
        !job.cancelled &&
        ACCEPTABLE_STATUSES.includes(job.status)
      );
    }

    case "job.complete":
      return !!ctx.job && session.staffId !== null && ctx.job.assignedStaffId === session.staffId;

    case "job.updateResult":
      return (
        (!!ctx.job && session.staffId !== null && ctx.job.assignedStaffId === session.staffId) ||
        isManager ||
        session.isAdmin
      );

    case "report.create":
    case "photo.upload":
      return (
        (!!ctx.job && session.staffId !== null && ctx.job.assignedStaffId === session.staffId) ||
        isManager ||
        session.isAdmin
      );

    case "report.edit":
    case "report.delete":
      return (
        (!!ctx.report && session.staffId !== null && ctx.report.staffId === session.staffId) ||
        isManager ||
        session.isAdmin
      );

    case "job.create":
    case "unit.edit":
      return isOwnerOrManager || session.isAdmin;

    case "team.view":
      return isOwnerOrManager || session.isAdmin;

    case "team.edit":
    case "manager.assign":
      return (
        session.isAdmin ||
        at(["owner"]).some((g) => g.managementMode === "self")
      );

    case "price.edit":
      return session.isAdmin || at(["manager"]).some((g) => g.canEditPrice);

    default:
      return false;
  }
}
