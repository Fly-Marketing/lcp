import { PageFrame } from "@/components/pilot/page-frame";
import { OpenJobsShell } from "@/components/pilot/master-detail-shell";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { listOpenJobsForCleaner } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

// Shared by /pilot/today and /pilot/today/[jobId], so the list loads once and stays on screen.
// If there is no session, the page renders its own sign-in redirect (keeping the return link).
export default async function TodayLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !hasRole(session, "cleaner")) return <>{children}</>;
  const jobs = await listOpenJobsForCleaner(session);

  return (
    <PageFrame session={session}>
      <OpenJobsShell hrefBase="/pilot/today" jobs={jobs}>
        {children}
      </OpenJobsShell>
    </PageFrame>
  );
}
