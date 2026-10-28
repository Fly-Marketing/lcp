import { PageFrame } from "@/components/pilot/page-frame";
import { HistoryShell } from "@/components/pilot/master-detail-shell";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { listMyJobs } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

// Shared by /pilot/my-jobs and /pilot/my-jobs/[jobId]. See the today layout for the sign-in note.
export default async function MyJobsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !hasRole(session, "cleaner")) return <>{children}</>;
  const jobs = await listMyJobs(session);

  return (
    <PageFrame session={session}>
      <HistoryShell jobs={jobs} listProps={{ hrefBase: "/pilot/my-jobs" }}>
        {children}
      </HistoryShell>
    </PageFrame>
  );
}
