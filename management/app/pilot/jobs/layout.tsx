import { PageFrame } from "@/components/pilot/page-frame";
import { ScheduleShell } from "@/components/pilot/master-detail-shell";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { listManagedJobs, listMyJobs, listOpenJobsForCleaner } from "@/lib/pilot/service";
import type { PilotJob } from "@/lib/pilot/types";

export const dynamic = "force-dynamic";

function uniqueById(jobs: PilotJob[]): PilotJob[] {
  return [...new Map(jobs.map((j) => [j.id, j])).values()];
}

// Shared by /pilot/jobs and /pilot/jobs/[jobId]. See the today layout for the sign-in note.
// All: the Today view (open work, grouped by date). My jobs: jobs you accept or are assigned to.
// Needs attention: managers and admins only.
export default async function ScheduleLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) return <>{children}</>;

  const staff = session.isAdmin || hasRole(session, "owner") || hasRole(session, "manager");
  const cleaner = hasRole(session, "cleaner");
  if (!staff && !cleaner) return <>{children}</>;

  const canFilterAttention = session.isAdmin || hasRole(session, "manager");
  // Only people who can be assigned jobs (a cleaner link) get a My jobs filter.
  const canFilterMine = session.staffId !== null;

  const [upcoming, history, attention, accepted, openForCleaner] = await Promise.all([
    staff ? listManagedJobs(session, { scope: "upcoming" }) : Promise.resolve([]),
    staff ? listManagedJobs(session, { scope: "history" }) : Promise.resolve([]),
    canFilterAttention ? listManagedJobs(session, { scope: "attention" }) : Promise.resolve([]),
    canFilterMine ? listMyJobs(session) : Promise.resolve([]),
    cleaner ? listOpenJobsForCleaner(session) : Promise.resolve([]),
  ]);

  const managed = [...upcoming, ...history];
  const assignedToMe = managed.filter((j) => session.staffId !== null && j.assignedStaffId === session.staffId);

  return (
    <PageFrame session={session}>
      <ScheduleShell
        allJobs={uniqueById([...openForCleaner, ...upcoming])}
        myJobs={uniqueById([...assignedToMe, ...accepted])}
        attentionJobs={attention}
        canFilterMine={canFilterMine}
        canFilterAttention={canFilterAttention}
      >
        {children}
      </ScheduleShell>
    </PageFrame>
  );
}
