import { PageFrame } from "@/components/pilot/page-frame";
import { StaffJobsShell } from "@/components/pilot/master-detail-shell";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { listManagedJobs } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

// Shared by /pilot/jobs and /pilot/jobs/[jobId]. See the today layout for the sign-in note.
export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (!session.isAdmin && !hasRole(session, "owner") && !hasRole(session, "manager"))) {
    return <>{children}</>;
  }

  const canFilter = session.isAdmin || hasRole(session, "manager");
  const [upcoming, history, attention] = await Promise.all([
    listManagedJobs(session, { scope: "upcoming" }),
    listManagedJobs(session, { scope: "history" }),
    canFilter ? listManagedJobs(session, { scope: "attention" }) : Promise.resolve([]),
  ]);

  return (
    <PageFrame session={session}>
      <StaffJobsShell allJobs={[...upcoming, ...history]} attentionJobs={attention} canFilter={canFilter}>
        {children}
      </StaffJobsShell>
    </PageFrame>
  );
}
