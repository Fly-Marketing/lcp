import { PageFrame } from "@/components/pilot/page-frame";
import { HistoryShell, StaffJobsShell } from "@/components/pilot/master-detail-shell";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { listManagedJobs, listMyJobs } from "@/lib/pilot/service";
import type { PilotJob } from "@/lib/pilot/types";

export const dynamic = "force-dynamic";

function uniqueById(jobs: PilotJob[]): PilotJob[] {
  return [...new Map(jobs.map((j) => [j.id, j])).values()];
}

// Shared by /pilot/jobs and /pilot/jobs/[jobId]. See the today layout for the sign-in note.
// Cleaners see their accepted jobs. Owners, managers and admins see the managed list with filters.
export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) return <>{children}</>;

  const staff = session.isAdmin || hasRole(session, "owner") || hasRole(session, "manager");
  const cleaner = hasRole(session, "cleaner");
  if (!staff && !cleaner) return <>{children}</>;

  if (!staff) {
    const jobs = await listMyJobs(session);
    return (
      <PageFrame session={session}>
        <HistoryShell jobs={jobs} listProps={{ hrefBase: "/pilot/jobs" }}>
          {children}
        </HistoryShell>
      </PageFrame>
    );
  }

  const canFilterAttention = session.isAdmin || hasRole(session, "manager");
  const [upcoming, history, attention, accepted] = await Promise.all([
    listManagedJobs(session, { scope: "upcoming" }),
    listManagedJobs(session, { scope: "history" }),
    canFilterAttention ? listManagedJobs(session, { scope: "attention" }) : Promise.resolve([]),
    cleaner ? listMyJobs(session) : Promise.resolve([]),
  ]);
  const allJobs = [...upcoming, ...history];
  const assignedToMe = allJobs.filter((j) => session.staffId !== null && j.assignedStaffId === session.staffId);

  return (
    <PageFrame session={session}>
      <StaffJobsShell
        allJobs={allJobs}
        myJobs={uniqueById([...assignedToMe, ...accepted])}
        attentionJobs={attention}
        canFilterAttention={canFilterAttention}
      >
        {children}
      </StaffJobsShell>
    </PageFrame>
  );
}
